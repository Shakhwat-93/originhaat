import { z } from 'zod';

export const checkoutSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'নাম কমপক্ষে ২ অক্ষর হতে হবে' })
    .max(100, { message: 'নাম সর্বোচ্চ ১০০ অক্ষর হতে পারে' }),
  phone: z
    .string()
    .regex(/^(?:\+88)?01[3-9]\d{8}$/, {
      message: 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX)',
    }),
  address: z
    .string()
    .min(10, { message: 'পূর্ণ ঠিকানা দিন (কমপক্ষে ১০ অক্ষর)' })
    .max(500, { message: 'ঠিকানা সর্বোচ্চ ৫০০ অক্ষর হতে পারে' }),
  district: z.string().min(1, { message: 'জেলা বেছে নিন' }),
  note: z.string().max(300, { message: 'নোট সর্বোচ্চ ৩০০ অক্ষর হতে পারে' }).optional(),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

export const adminLoginSchema = z.object({
  password: z.string().min(1, { message: 'পাসওয়ার্ড দিন' }),
});
