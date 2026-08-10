import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSettings } from '@/lib/db';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

export async function POST(request: NextRequest) {
  try {
    const { chatId, message, customerName } = await request.json();

    if (!chatId || !message) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Fetch AI configurations and live settings from DB
    const settings = await getSettings();
    const isAiActive = settings?.chat_ai_active ?? false;
    const apiKey = settings?.chat_ai_api_key || process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;

    // If AI responder is not active or key is missing, exit silently
    if (!isAiActive || !apiKey) {
      return NextResponse.json({ success: false, message: 'AI auto-responder is disabled or API key is not configured.' });
    }

    // 2. Fetch live data in parallel for real-time knowledge base
    const [chatRes, productsRes, categoriesRes, messagesRes] = await Promise.all([
      // Chat session metadata (visitor phone, current page)
      supabase.from('oh_chats').select('*').eq('id', chatId).single(),
      // Active Products
      supabase.from('oh_products')
        .select('id, name_bn, name_en, price, original_price, stock, slug, category_slug, variants, short_description_bn, benefits')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(100),
      // Active Categories
      supabase.from('oh_categories')
        .select('name_bn, name_en, slug')
        .eq('is_active', true),
      // Past 15 messages for context
      supabase.from('oh_chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(15)
    ]);

    const chatData = chatRes.data;
    const products = productsRes.data || [];
    const categories = categoriesRes.data || [];
    const messages = messagesRes.data || [];

    // 3. Check for customer order context if phone or order number is present
    let orderContext = '';
    const phoneMatch = message.match(/(?:(?:\+88|88)?(01[3-9]\d{8}))/);
    const orderMatch = message.match(/(?:OH-?\d+|#?\d{4,8})/i);
    const customerPhone = phoneMatch ? phoneMatch[1] : (chatData?.customer_phone || null);

    if (customerPhone || orderMatch) {
      let orderQuery = supabase.from('oh_orders').select('*').order('created_at', { ascending: false }).limit(3);
      if (orderMatch) {
        const cleanOrderNum = orderMatch[0].replace('#', '');
        orderQuery = orderQuery.ilike('order_number', `%${cleanOrderNum}%`);
      } else if (customerPhone) {
        orderQuery = orderQuery.eq('phone', customerPhone);
      }

      const { data: matchedOrders } = await orderQuery;
      if (matchedOrders && matchedOrders.length > 0) {
        orderContext = matchedOrders.map(o => 
          `- Order #${o.order_number}: Status='${o.status}', Total=৳${o.grand_total || o.total_price}, Delivery Address='${o.address || o.city}', Tracking='${o.steadfast_tracking_code || o.pathao_consignment_id || 'Processing'}'`
        ).join('\n');
      }
    }

    // 4. Sort and select relevant products based on query keywords
    const lowerQuery = message.toLowerCase();
    const sortedProducts = [...products].sort((a, b) => {
      const aMatch = `${a.name_bn || ''} ${a.name_en || ''} ${a.short_description_bn || ''}`.toLowerCase().includes(lowerQuery);
      const bMatch = `${b.name_bn || ''} ${b.name_en || ''} ${b.short_description_bn || ''}`.toLowerCase().includes(lowerQuery);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });

    const productsCatalog = sortedProducts.slice(0, 20).map((p) => {
      const pName = p.name_bn || p.name_en;
      const priceText = `৳${p.price}${p.original_price && p.original_price > p.price ? ` (আগের দাম: ৳${p.original_price})` : ''}`;
      const stockText = p.stock > 0 ? `ইন স্টক (${p.stock})` : 'স্টক শেষ';
      return `• ${pName} | দাম: ${priceText} | ${stockText}`;
    }).join('\n');

    // 5. Format Categories & FAQs compactly
    const categoriesList = categories.slice(0, 10).map(c => c.name_bn || c.name_en).join(', ');
    const faqsList = Array.isArray(settings?.default_faqs) && settings.default_faqs.length > 0
      ? settings.default_faqs.slice(0, 3).map((f: any) => `Q: ${f.question} | A: ${f.answer}`).join('\n')
      : '';

    // 6. Find currently viewed product if user is on a product page
    let viewedProductInfo = '';
    if (chatData?.current_page && chatData.current_page.includes('/product/')) {
      const slug = chatData.current_page.split('/product/')[1]?.split('?')[0];
      const viewedP = products.find(p => p.slug === slug);
      if (viewedP) {
        viewedProductInfo = `গ্রাহক বর্তমানে দেখছেন: "${viewedP.name_bn || viewedP.name_en}" (দাম: ৳${viewedP.price}, স্টক: ${viewedP.stock} পিস)`;
      }
    }

    // 7. Compact Live Master System Prompt
    const fullSystemPrompt = `You are a human customer support executive for ${settings?.site_name || 'Origin Haat'}.
Answer naturally, politely, and briefly (1-2 sentences) in the same language as the customer (Bangla/Banglish).
Always use the EXACT live store data below. Never invent fake info or old rates.

=== 🛒 STORE LIVE DATABASE ===
হটলাইন/WhatsApp: ${settings?.hotline_number || settings?.whatsapp_number || '01828173592'}
ডেলিভারি চার্জ: ঢাকায় ৳${settings?.delivery_charge_inside ?? 80} টাকা, ঢাকার বাইরে ৳${settings?.delivery_charge_outside ?? 110} টাকা।
ফ্রি ডেলিভারি: ৳${settings?.free_delivery_min_order ?? 3000}+ টাকার অর্ডারে ফ্রি ডেলিভারি।
ডেলিভারি সময়: ঢাকায় ১–২ দিন, ঢাকার বাইরে ২–৩ দিন।
পেমেন্ট: ক্যাশ অন ডেলিভারি (পণ্য দেখে পেমেন্ট), bKash, Nagad।
রিটার্ন: ৭ দিনের সহজ রিটার্ন বা রিপ্লেসমেন্ট।
${viewedProductInfo ? `\n📌 ${viewedProductInfo}\n` : ''}
=== 📦 PRODUCTS IN STORE ===
${productsCatalog}

=== 📂 CATEGORIES ===
${categoriesList || 'স্মার্ট গ্যাজেটস, কিচেন আইটেম, হেলথ অ্যান্ড বিউটি'}
${orderContext ? `\n=== 🧾 CUSTOMER ORDER ===\n${orderContext}\n` : ''}
${faqsList ? `\n=== ❓ FAQs ===\n${faqsList}\n` : ''}

RULES:
- When asked what products exist, mention 2-3 popular items with real prices and ask what they need.
- When asked price/stock/delivery, give the exact live number from above.
- Natural, human, super short Bangla. No robotic text.`;

    // 8. Map messages history for context
    const history = messages
      .filter(m => m.sender_role !== 'system' && m.body)
      .slice(-6, -1) // keep last 5 messages for compact tokens
      .map(m => ({
        role: m.sender_role === 'customer' ? ('user' as const) : ('assistant' as const),
        content: m.body || ''
      }));

    let aiText = '';

    if (apiKey.startsWith('gsk_')) {
      // ─── Groq API (llama-3.1-8b-instant) ───
      const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
      
      const openaiMessages = [
        { role: 'system', content: fullSystemPrompt },
        ...history.map(h => ({
          role: h.role,
          content: h.content
        })),
        { role: 'user', content: `${customerName || 'Visitor'}: ${message}` }
      ];

      let res = await fetch(groqUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: openaiMessages,
          temperature: 0.4,
          max_tokens: 250
        })
      });

      // Quick retry after 700ms on 429 rate limit
      if (!res.ok && res.status === 429) {
        await new Promise(r => setTimeout(r, 700));
        res = await fetch(groqUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: openaiMessages,
            temperature: 0.4,
            max_tokens: 250
          })
        });
      }

      if (res.ok) {
        const resJson = await res.json();
        aiText = resJson.choices?.[0]?.message?.content;
      } else {
        const errText = await res.text();
        console.error('[AI Auto-Reply] Groq API call failed:', res.status, errText);
        
        // Fallback to Gemini if Groq failed and Gemini Key is available
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
          try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
            const gRes = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  role: 'user',
                  parts: [{
                    text: `${fullSystemPrompt}\n\n=== চ্যাট হিস্ট্রি ===\n${
                      history.map(h => `${h.role === 'user' ? 'Customer' : 'Assistant'}: ${h.content}`).join('\n')
                    }\n\nCustomer (${customerName || 'Visitor'}): ${message}\nAssistant:`
                  }]
                }]
              })
            });
            if (gRes.ok) {
              const gJson = await gRes.json();
              aiText = gJson.candidates?.[0]?.content?.parts?.[0]?.text;
            }
          } catch (_) {}
        }
      }
    } else if (apiKey.startsWith('sk-')) {
      // ─── OpenAI API ───
      const openaiUrl = 'https://api.openai.com/v1/chat/completions';
      
      const openaiMessages = [
        { role: 'system', content: fullSystemPrompt },
        ...history.map(h => ({
          role: h.role,
          content: h.content
        })),
        { role: 'user', content: `${customerName || 'Visitor'}: ${message}` }
      ];

      const res = await fetch(openaiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: openaiMessages,
          temperature: 0.5,
          max_tokens: 350
        })
      });

      if (res.ok) {
        const resJson = await res.json();
        aiText = resJson.choices?.[0]?.message?.content;
      }
    } else {
      // ─── Google Gemini REST API ───
      const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{
              text: `${fullSystemPrompt}\n\n=== চ্যাট হিস্ট্রি ===\n${
                history.map(h => `${h.role === 'user' ? 'Customer' : 'Assistant'}: ${h.content}`).join('\n')
              }\n\nCustomer (${customerName || 'Visitor'}): ${message}\nAssistant:`
            }]
          }
        ]
      };

      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const resJson = await res.json();
        aiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      }
    }

    if (!aiText) {
      // Graceful instant fallback based on real-time database data
      const msgLower = message.toLowerCase();
      if (msgLower.includes('delivery') || msgLower.includes('ডেলিভারি') || msgLower.includes('charge') || msgLower.includes('চার্জ')) {
        aiText = `ঢাকায় ডেলিভারি চার্জ ৳${settings?.delivery_charge_inside ?? 80} এবং ঢাকার বাইরে ৳${settings?.delivery_charge_outside ?? 110} টাকা। ৳${settings?.free_delivery_min_order ?? 3000}+ টাকার অর্ডারে সারা দেশে ফ্রি ডেলিভারি!`;
      } else if (msgLower.includes('hotline') || msgLower.includes('হটলাইন') || msgLower.includes('number') || msgLower.includes('নম্বর') || msgLower.includes('phone') || msgLower.includes('ফোন') || msgLower.includes('whatsapp') || msgLower.includes('হোয়াটসঅ্যাপ')) {
        aiText = `আমাদের হটলাইন ও WhatsApp নম্বর: ${settings?.hotline_number || settings?.whatsapp_number || '01828173592'}।`;
      } else if (msgLower.includes('return') || msgLower.includes('রিটার্ন') || msgLower.includes('ফেরত') || msgLower.includes('exchange')) {
        aiText = 'পণ্য হাতে পাওয়ার পর ৭ দিনের মধ্যে সহজ রিটার্ন ও এক্সচেঞ্জ সুবিধা রয়েছে।';
      } else if (msgLower.includes('cod') || msgLower.includes('cash on delivery') || msgLower.includes('ক্যাশ অন ডেলিভারি')) {
        aiText = 'জি, সারাদেশে ক্যাশ অন ডেলিভারি (পণ্য হাতে পেয়ে পেমেন্ট) সুবিধা রয়েছে।';
      } else if (sortedProducts.length > 0 && (sortedProducts[0].name_bn + sortedProducts[0].name_en).toLowerCase().includes(msgLower)) {
        const p = sortedProducts[0];
        aiText = `${p.name_bn || p.name_en}-এর বর্তমান মূল্য ৳${p.price} টাকা। এটি স্টকে রয়েছে।`;
      } else if (sortedProducts.length > 0) {
        const topP = sortedProducts.slice(0, 3).map(p => `${p.name_bn || p.name_en} (৳${p.price})`).join(', ');
        aiText = `আমাদের কাছে ${topP} ইত্যাদি রয়েছে। আপনি কোনটি সম্পর্কে জানতে চান?`;
      } else {
        aiText = `ধন্যবাদ! ${settings?.site_name || 'Origin Haat'}-এ আপনাকে স্বাগতম। আপনি কোন প্রোডাক্টটি খুঁজছেন?`;
      }
    }

    // 10. Insert AI reply into database as an agent
    const { error: insertErr } = await supabase
      .from('oh_chat_messages')
      .insert({
        chat_id: chatId,
        sender_role: 'agent',
        sender_name: 'AI Assistant 🤖',
        body: aiText.trim()
      });

    if (insertErr) {
      console.error('[AI Auto-Reply] Insert reply error:', insertErr);
      return NextResponse.json({ error: 'Failed to save AI response' }, { status: 500 });
    }

    return NextResponse.json({ success: true, response: aiText.trim() });
  } catch (err: any) {
    console.error('[AI Auto-Reply Exception]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
