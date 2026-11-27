const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');

const app = express();
const PORT = process.env.PORT || 3000;

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://VOLIDAMAKA:Azizjon@cluster0.haun4zb.mongodb.net/volidam?retryWrites=true&w=majority';

const BOT_TOKEN =
  process.env.BOT_TOKEN || '9184922987:AAF1idEHNw_HqwS23uozVB1Ju2uFDmywKxU';

const SECRET_PASS = (process.env.SECRET_PASS || 'volidam777').trim();

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Statik fayllar (rasmlar, css va h.k.)
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// HTML xavfsizligi (Telegram xabarlari buzilmasligi uchun)
function escHtml(str) {
  return String(str || '').replace(/[&<>]/g, (c) => ({ '&': '&', '<': '<', '>': '>' }[c]));
}

// Boshlang'ich 27 ta mahsulot (MongoDB bo'sh bo'lsa, 1 marta avtomatik yuklanadi)
const DEFAULT_PRODUCTS = [
  { name: "Bordo Dvoyka Kostyum", priceNum: 450000, priceStr: "450.000 so'm", description: "Yuqori sifatli materialdan ishlangan zamonaviy bordo rangli ayollar dvoykasi.", images: ["3.jpg"] },
  { name: "Qora Dvoyka Kostyum", priceNum: 450000, priceStr: "450.000 so'm", description: "Jozibali va qulay qora rangdagi eksklyuziv model.", images: ["4.jpg"] },
  { name: "Kulrang Yubka Komplekt", priceNum: 580000, priceStr: "580.000 so'm", description: "Hashamatli uslubdagi sviter va yubka jamlanmasi.", images: ["5.jpg"] },
  { name: "Bej rangli Kostyum-Yubka", priceNum: 550000, priceStr: "550.000 so'm", description: "Kamar bilan bezatilgan nafis bej rangdagi libos.", images: ["6.jpg"] },
  { name: "Bordo Mexli Pancho", priceNum: 420000, priceStr: "420.000 so'm", description: "Issiq va hashamatli mexli yoqaga ega pancho dizayni.", images: ["7.jpg"] },
  { name: "Kulrang Mexli Pancho", priceNum: 420000, priceStr: "420.000 so'm", description: "Sovuq kunlar uchun qulay va jozibali mexli pancho.", images: ["8.jpg"] },
  { name: "Gulli Naqshli Uzun Ko'ylak", priceNum: 480000, priceStr: "480.000 so'm", description: "Naqshinkor gullar bilan bezatilgan nafis ayollar libosi.", images: ["9.jpg"] },
  { name: "Xaki rangli Kardigan", priceNum: 450000, priceStr: "450.000 so'm", description: "Zamonaviy va keng bichimdagi yumshoq kardigan.", images: ["10.jpg"] },
  { name: "Oq Kardigan va Yubka", priceNum: 520000, priceStr: "520.000 so'm", description: "Yengil va nafis uslubdagi oq kardigan hamda yubka to'plami.", images: ["11.jpg"] },
  { name: "Mis rangli Sviter va Shim", priceNum: 460000, priceStr: "460.000 so'm", description: "Qulay sport-klassik uslubdagi zamonaviy to'plam.", images: ["12.jpg"] },
  { name: "Qora Zamonaviy Dvoyka", priceNum: 470000, priceStr: "470.000 so'm", description: "Zal va kundalik yurish uchun mos keluvchi qora rangli zamonaviy kostyum.", images: ["13.jpg"] },
  { name: "Qora Naqshinkor Abaya", priceNum: 620000, priceStr: "620.000 so'm", description: "O'ziga xos naqshlar bilan bezatilgan hashamatli qora abaya.", images: ["14.jpg"] },
  { name: "Premium Klass Abaya", priceNum: 650000, priceStr: "650.000 so'm", description: "Nozik ishlov berilgan yeng qismiga ega premium abaya.", images: ["15.jpg"] },
  { name: "Yashil Bo'yinbog'li Sviter", priceNum: 340000, priceStr: "340.000 so'm", description: "Yumshoq va issiq och yashil rangdagi qulay sviter.", images: ["16.jpg"] },
  { name: "Qahva rangli Sharf va Shapka to'plami", priceNum: 280000, priceStr: "280.000 so'm", description: "Brend logotipli issiq bosh kiyim va sharf to'plami.", images: ["17.jpg"] },
  { name: "Qora Sharf va Shapka to'plami", priceNum: 280000, priceStr: "280.000 so'm", description: "Qora rangdagi qulay va zamonaviy qishki to'plam.", images: ["18.jpg"] },
  { name: "Sut rangli Shapka", priceNum: 150000, priceStr: "150.000 so'm", description: "Italiya dizaynidagi zamonaviy issiq bosh kiyim.", images: ["19.jpg"] },
  { name: "Bej rangli Sharf va Shapka to'plami", priceNum: 280000, priceStr: "280.000 so'm", description: "Qishki mavsum uchun nafis bej aksessuarlar.", images: ["20.jpg"] },
  { name: "Kulrang Gulli Kardigan", priceNum: 450000, priceStr: "450.000 so'm", description: "O'ziga xos gulli naqshlar tushirilgan kulrang kardigan.", images: ["21.jpg"] },
  { name: "Chiziqli Sviter", priceNum: 320000, priceStr: "320.000 so'm", description: "Oq va qora chiziqli zamonaviy dizayndagi sviter.", images: ["22.jpg"] },
  { name: "Qizil Qo'shaloq Tugmali Cape", priceNum: 490000, priceStr: "490.000 so'm", description: "Tilla rang tugmali va o'ziga xos bichimdagi qizil cape libosi.", images: ["23.jpg"] },
  { name: "Qora Mexli Cape", priceNum: 510000, priceStr: "510.000 so'm", description: "Oq sun'iy mex yoqali hashamatli qora cape.", images: ["24.jpg"] },
  { name: "Kulrang Sport Kostyum", priceNum: 460000, priceStr: "460.000 so'm", description: "Qulay va keng bichimli sport stilidagi to'plam.", images: ["25.jpg"] },
  { name: "Qora Keng Sviter", priceNum: 350000, priceStr: "350.000 so'm", description: "Yengil va qulay qora rangdagi kundalik sviter.", images: ["26.jpg"] },
  { name: "Bordo rangli Keng Sviter", priceNum: 350000, priceStr: "350.000 so'm", description: "Issiq va jozibali bordo rangli yumshoq sviter.", images: ["27.jpg"] },
  { name: "Bej rangli Uzun Tunika", priceNum: 420000, priceStr: "420.000 so'm", description: "Oppoq aksessuarlar bilan mukammal mos tushuvchi bej tunika.", images: ["28.jpg"] },
  { name: "To'q kulrang Dvoyka", priceNum: 450000, priceStr: "450.000 so'm", description: "Zanjirli aksessuarlar bilan to'ldirilgan to'q kulrang kostyum.", images: ["29.jpg"] }
];

// ================= MONGODB SXEMALARI =================
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    priceNum: { type: Number, required: true, default: 0 },
    priceStr: { type: String, required: true },
    description: { type: String, default: '' },
    images: { type: [String], default: ['3.jpg'] }
  },
  { timestamps: true }
);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

const siteConfigSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'main' },
    hero: { type: String, default: '3.jpg' },
    about1: { type: String, default: '3.jpg' },
    about2: { type: String, default: '4.jpg' },
    seeded: { type: Boolean, default: false },
    adminChatIds: { type: [Number], default: [] }
  },
  { timestamps: true }
);
const SiteConfig = mongoose.models.SiteConfig || mongoose.model('SiteConfig', siteConfigSchema);

const orderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, default: '' },
    items: [
      {
        name: String,
        priceStr: String,
        quantity: { type: Number, default: 1 }
      }
    ],
    totalText: { type: String, default: "0 so'm" },
    totalAmount: { type: Number, default: 0 },
    status: { type: String, default: 'Yangi' }
  },
  { timestamps: true }
);
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

let cachedAdminIds = new Set();

async function getSiteConfig() {
  let cfg = await SiteConfig.findOne({ key: 'main' });
  if (!cfg) {
    cfg = await SiteConfig.create({ key: 'main' });
  }
  return cfg;
}

// MongoDB ulanishi
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB ulandi');
    const cfg = await getSiteConfig();
    (cfg.adminChatIds || []).forEach((id) => cachedAdminIds.add(id));

    // Agar baza bo'sh va hali yuklanmagan bo'lsa, 27 ta mahsulotni 1 marta qo'shish
    const count = await Product.countDocuments();
    if (count === 0 && !cfg.seeded) {
      await Product.insertMany(DEFAULT_PRODUCTS);
      cfg.seeded = true;
      await cfg.save();
      console.log('📦 27 ta boshlang‘ich mahsulot MongoDB ga yuklandi');
    }
  })
  .catch((err) => {
    console.error('❌ MongoDB ulanish xatosi:', err.message);
  });

// Admin parol tekshiruvi middleware
function requireAdmin(req, res, next) {
  const pass = String(req.headers['x-admin-pass'] || '').trim();
  if (pass !== SECRET_PASS) {
    return res.status(401).json({ error: "Parol noto'g'ri!" });
  }
  next();
}

// ================= API YO'LLARI =================

// Admin parolini tekshirish
app.post('/api/admin/verify', (req, res) => {
  const pass = String(req.body?.password || '').trim();
  if (pass === SECRET_PASS) {
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, error: "Parol noto'g'ri!" });
});

// Barcha mahsulotlarni olish (hamma mijozlar uchun)
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Mahsulotlarni olishda xatolik' });
  }
});

// Yangi mahsulot qo'shish (Admin)
app.post('/api/products', requireAdmin, async (req, res) => {
  try {
    const { name, priceStr, priceNum, description, images } = req.body;
    if (!name || !priceStr) {
      return res.status(400).json({ error: 'Kiyim nomi va narxi kiritilishi shart' });
    }
    const cleanPriceNum =
      typeof priceNum === 'number' && priceNum > 0
        ? priceNum
        : parseInt(String(priceStr).replace(/\D/g, ''), 10) || 0;

    const product = await Product.create({
      name: String(name).trim(),
      priceStr: String(priceStr).trim(),
      priceNum: cleanPriceNum,
      description: String(description || '').trim(),
      images: Array.isArray(images) && images.length ? images : ['3.jpg']
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: "Mahsulot qo'shishda xatolik", details: err.message });
  }
});

// Mahsulotni o'chirish (Admin)
app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Mahsulot topilmadi' });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Mahsulotni o'chirishda xatolik" });
  }
});

// Sayt rasmlarini olish (Bosh banner, Biz haqimizda 1 va 2)
app.get('/api/site-images', async (req, res) => {
  try {
    const cfg = await getSiteConfig();
    res.json({
      hero: cfg.hero || '3.jpg',
      about1: cfg.about1 || '3.jpg',
      about2: cfg.about2 || '4.jpg'
    });
  } catch (err) {
    res.json({ hero: '3.jpg', about1: '3.jpg', about2: '4.jpg' });
  }
});

// Sayt rasmlarini yangilash (Admin -> MongoDB -> Hamma mijozlarga ko'rinadi)
app.put('/api/site-images', requireAdmin, async (req, res) => {
  try {
    const { hero, about1, about2 } = req.body;
    const cfg = await getSiteConfig();
    if (hero !== undefined) cfg.hero = hero || '3.jpg';
    if (about1 !== undefined) cfg.about1 = about1 || '3.jpg';
    if (about2 !== undefined) cfg.about2 = about2 || '4.jpg';
    await cfg.save();
    res.json({ hero: cfg.hero, about1: cfg.about1, about2: cfg.about2 });
  } catch (err) {
    res.status(400).json({ error: 'Rasmlarni saqlashda xatolik' });
  }
});

// Buyurtma qabul qilish (ham /api/orders, ham /api/order ishlaydi)
async function handleCreateOrder(req, res) {
  try {
    const customerName = String(req.body.customerName || req.body.name || '').trim();
    const phone = String(req.body.phone || '').trim();
    const address = String(req.body.address || '').trim();
    const totalText = String(req.body.totalText || req.body.total || "0 so'm");
    const totalAmount =
      Number(req.body.totalAmount) || parseInt(totalText.replace(/\D/g, ''), 10) || 0;

    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
    const items = rawItems.map((it) => {
      if (typeof it === 'string') return { name: it, quantity: 1, priceStr: '' };
      return {
        name: String(it.name || 'Mahsulot'),
        quantity: Number(it.quantity || it.qty || 1),
        priceStr: String(it.priceStr || '')
      };
    });

    if (!customerName || !phone) {
      return res.status(400).json({ error: 'Ism va telefon raqami majburiy' });
    }

    const order = await Order.create({
      customerName,
      phone,
      address,
      items,
      totalText,
      totalAmount
    });

    // MongoDB dagi barcha adminlarga Telegram xabari yuborish
    if (bot) {
      try {
        const cfg = await getSiteConfig();
        const chatIds = new Set([...cachedAdminIds, ...(cfg.adminChatIds || [])]);

        const itemsText = items
          .map(
            (item, idx) =>
              `${idx + 1}. ${escHtml(item.name)} — ${item.quantity} dona${
                item.priceStr ? ` (${escHtml(item.priceStr)})` : ''
              }`
          )
          .join('\n');

        const message =
          `🛍 <b>Yangi buyurtma!</b>\n\n` +
          `👤 <b>Mijoz:</b> ${escHtml(order.customerName)}\n` +
          `📞 <b>Telefon:</b> ${escHtml(order.phone)}\n` +
          `📍 <b>Manzil:</b> ${escHtml(order.address || "Ko'rsatilmagan")}\n` +
          `📦 <b>Mahsulotlar:</b>\n${itemsText || "Ko'rsatilmagan"}\n\n` +
          `💰 <b>Jami:</b> ${escHtml(order.totalText)}`;

        for (const chatId of chatIds) {
          bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' }).catch((e) => {
            console.error(`Telegram yuborish xatosi (${chatId}):`, e.message);
          });
        }
      } catch (botErr) {
        console.error('Telegram bildirishnoma xatosi:', botErr.message);
      }
    }

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: 'Buyurtmani saqlashda xatolik', details: err.message });
  }
}

app.post('/api/orders', handleCreateOrder);
app.post('/api/order', handleCreateOrder);

// ================= GOOGLE SEO: ROBOTS.TXT VA SITEMAP.XML =================
app.get('/robots.txt', (req, res) => {
  const baseUrl = `https://${req.get('host')}`;
  res.type('text/plain').send(`User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`);
});

app.get('/sitemap.xml', (req, res) => {
  const baseUrl = `https://${req.get('host')}`;
  const today = new Date().toISOString().split('T')[0];
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `  <url>\n` +
      `    <loc>${baseUrl}/</loc>\n` +
      `    <lastmod>${today}</lastmod>\n` +
      `    <changefreq>daily</changefreq>\n` +
      `    <priority>1.0</priority>\n` +
      `  </url>\n` +
      `</urlset>`
  );
});

// Bosh sahifa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ================= TELEGRAM BOT =================
let bot = null;

if (BOT_TOKEN) {
  bot = new Telegraf(BOT_TOKEN);

  bot.catch((err) => {
    console.error('⚠️ Bot xatosi:', err.message);
  });

  bot.start(async (ctx) => {
    try {
      await ctx.reply(
        `Assalomu alaykum! <b>VOLIDAM by Soliya</b> botiga xush kelibsiz.\n\n` +
          `Admin boshqaruvini faollashtirish uchun maxfiy parolni yuboring:`,
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      console.error('Start xatosi:', e.message);
    }
  });

  bot.command('admin', async (ctx) => {
    await ctx.reply('Admin panelga kirish uchun maxfiy parolni yuboring:');
  });

  bot.on('text', async (ctx) => {
    try {
      const text = (ctx.message.text || '').trim();
      const chatId = ctx.chat.id;

      // Parol tekshiruvi (katta-kichik harf farqsiz)
      if (text.toLowerCase() === SECRET_PASS.toLowerCase()) {
        cachedAdminIds.add(chatId);
        try {
          await SiteConfig.findOneAndUpdate(
            { key: 'main' },
            { $addToSet: { adminChatIds: chatId } },
            { upsert: true }
          );
        } catch (dbErr) {
          console.error('Admin ID saqlash xatosi:', dbErr.message);
        }

        await ctx.reply(
          `✅ <b>Admin rejimi yoqildi!</b>\n\nEndi saytdan tushgan barcha yangi buyurtmalar shu yerga keladi.`,
          {
            parse_mode: 'HTML',
            ...Markup.keyboard([['📦 Buyurtmalar', '🛍 Mahsulotlar soni']]).resize()
          }
        );
        return;
      }

      // Admin ekanligini tekshirish
      let isAdmin = cachedAdminIds.has(chatId);
      if (!isAdmin) {
        const cfg = await getSiteConfig();
        isAdmin = (cfg.adminChatIds || []).includes(chatId);
        if (isAdmin) cachedAdminIds.add(chatId);
      }

      if (text === '📦 Buyurtmalar') {
        if (!isAdmin) {
          return ctx.reply('Avval maxfiy parolni yuborib admin sifatida kiring.');
        }
        const orders = await Order.find().sort({ createdAt: -1 }).limit(5);
        if (!orders.length) {
          return ctx.reply('Hozircha buyurtmalar yo‘q.');
        }
        const list = orders
          .map(
            (o, i) =>
              `${i + 1}. <b>${escHtml(o.customerName)}</b> (${escHtml(o.phone)})\n   💰 ${escHtml(
                o.totalText
              )} | 📍 ${escHtml(o.address || '-')}`
          )
          .join('\n\n');
        return ctx.reply(`📋 <b>Oxirgi 5 ta buyurtma:</b>\n\n${list}`, { parse_mode: 'HTML' });
      }

      if (text === '🛍 Mahsulotlar soni') {
        if (!isAdmin) {
          return ctx.reply('Avval maxfiy parolni yuborib admin sifatida kiring.');
        }
        const count = await Product.countDocuments();
        return ctx.reply(`Bazadagi mahsulotlar soni: <b>${count}</b> ta`, { parse_mode: 'HTML' });
      }

      // Noto'g'ri parol yoki boshqa matn yozilganda jim qolmaslik uchun
      if (!isAdmin) {
        await ctx.reply("❌ Parol noto'g'ri. Admin kirishi uchun to'g'ri maxfiy parolni yuboring.");
      }
    } catch (err) {
      console.error('Bot text handler xatosi:', err.message);
      ctx.reply('⚠️ Xatolik yuz berdi, qayta urinib ko‘ring.').catch(() => {});
    }
  });

  // Eski webhook bo'lsa o'chirib, toza polling bilan yoqish
  bot.telegram
    .deleteWebhook({ drop_pending_updates: true })
    .then(() => bot.launch({ dropPendingUpdates: true }))
    .then(() => {
      console.log('🤖 Telegram bot ishga tushdi');
    })
    .catch((err) => {
      console.error('⚠️ Telegram bot ishga tushmadi:', err.message);
    });

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT}-portda ishga tushdi`);
});
