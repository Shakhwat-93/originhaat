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

    // 1. Fetch AI configurations from settings
    const settings = await getSettings();
    const isAiActive = settings?.chat_ai_active ?? false;
    const apiKey = settings?.chat_ai_api_key || process.env.GEMINI_API_KEY;
    const systemPrompt = settings?.chat_ai_instructions || 
      'You are an AI assistant for Origin Haat. Answer customer queries politely in Bengali. Keep answers concise. Delivery: Inside Dhaka 60 TK, Outside Dhaka 120 TK. Free shipping above 999 TK.';

    // If AI responder is not active or key is missing, exit silently
    if (!isAiActive || !apiKey) {
      return NextResponse.json({ success: false, message: 'AI auto-responder is disabled or API key is not configured.' });
    }

    // 2. Fetch past 15 messages for context
    const { data: messages, error: fetchErr } = await supabase
      .from('oh_chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(15);

    if (fetchErr || !messages) {
      console.error('[AI Auto-Reply] Fetch message error:', fetchErr);
      return NextResponse.json({ error: 'Failed to fetch conversation history' }, { status: 500 });
    }

    // Map messages history for context
    const history = messages
      .filter(m => m.sender_role !== 'system' && m.body)
      .slice(0, -1) // exclude the last one as it's the current message
      .map(m => ({
        role: m.sender_role === 'customer' ? ('user' as const) : ('model' as const),
        text: `${m.sender_name}: ${m.body}`
      }));

    let aiText = '';

    if (apiKey.startsWith('gsk_')) {
      // ─── Groq API (OpenAI Compatible) ───
      const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
      
      const openaiMessages = [
        { role: 'system', content: systemPrompt },
        ...history.map(h => ({
          role: h.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: h.text
        })),
        { role: 'user', content: `${customerName || 'Visitor'}: ${message}` }
      ];

      const res = await fetch(groqUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: openaiMessages,
          temperature: 0.7
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[AI Auto-Reply] Groq API call failed:', res.status, errText);

        let errorBody = '⚠️ AI Auto-Reply Error: Groq API request failed. Please check your key or rate limits.';
        if (res.status === 401) {
          errorBody = '⚠️ AI Auto-Reply Error: Invalid Groq API Key (401).';
        } else if (res.status === 429) {
          errorBody = '⚠️ AI Auto-Reply Error: Groq Rate Limit Exceeded (429).';
        }

        await supabase
          .from('oh_chat_messages')
          .insert({
            chat_id: chatId,
            sender_role: 'system',
            sender_name: 'System',
            body: errorBody
          });

        return NextResponse.json({ error: 'Failed to generate response from Groq', status: res.status }, { status: 502 });
      }

      const resJson = await res.json();
      aiText = resJson.choices?.[0]?.message?.content;
    } else {
      // ─── Gemini REST API ───
      const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{
              text: `System Instructions: ${systemPrompt}\n\nConversation History:\n${
                history.map(h => `${h.role === 'user' ? 'Customer' : 'Assistant'}: ${h.text}`).join('\n')
              }\n\nCustomer (${customerName || 'Visitor'}): ${message}\nAssistant: `
            }]
          }
        ]
      };

      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[AI Auto-Reply] Gemini API call failed:', res.status, errText);

        if (res.status === 429) {
          await supabase
            .from('oh_chat_messages')
            .insert({
              chat_id: chatId,
              sender_role: 'system',
              sender_name: 'System',
              body: '⚠️ AI Auto-Reply Error: Google Gemini API Quota Exceeded (429). Please verify your Google AI Studio quota limits or billing account setup.'
            });
        } else if (res.status === 400 || res.status === 403) {
          await supabase
            .from('oh_chat_messages')
            .insert({
              chat_id: chatId,
              sender_role: 'system',
              sender_name: 'System',
              body: '⚠️ AI Auto-Reply Error: Invalid Gemini API Key (400/403). Please verify your API Key in Admin Settings.'
            });
        }

        return NextResponse.json({ error: 'Failed to generate response from AI', status: res.status }, { status: 502 });
      }

      const resJson = await res.json();
      aiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    if (!aiText) {
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 502 });
    }

    // 4. Insert AI reply into database as an agent
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
