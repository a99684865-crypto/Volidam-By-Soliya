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
  process.env.BOT_TOKEN || '9076791095:AAElEEUK4ChCRsx-kpFpniA-3xjJqBS5JlU';

const SECRET_PASS = process.env.SECRET_PASS || 'volidam777';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Statik fayllar
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB ulanishi
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB ulandi');
  })
  .catch((err) => {
    console.error('❌ MongoDB ulanish xatosi:', err.message);
  });

// Mahsulot sxemasi
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: 'Umumiy' },
    price: { type: Number, required: true },
    oldPrice: { type: Number, default: 0 },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    inStock: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

// Buyurtma sxemasi
const orderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, default: '' },
    paymentMethod: { type: String, default: 'Naqd / Kelishilgan holda' },
    items: [
      {
        productId: String,
        name: String,
        price: Number,
        quantity: { type: Number, default: 1 }
      }
    ],
    totalAmount: { type: Number, required: true },
    status: { type: String, default: 'Yangi' }
  },
  { timestamps: true }
);

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// API: Barcha mahsulotlar
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Mahsulotlarni olishda xatolik' });
  }
});

// API: Yangi mahsulot qo'shish
app.post('/api/products', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: 'Mahsulot qo‘shishda xatolik', details: err.message });
  }
});

// API: Buyurtma qabul qilish va Telegram adminga yuborish
app.post('/api/orders', async (req, res) => {
  try {
    const order = await Order.create(req.body);

    if (bot && adminChatId) {
      const itemsText = (order.items || [])
        .map((item, idx) => `${idx + 1}. ${item.name} — ${item.quantity} dona (${item.price} so'm)`)
        .join('\n');

      const message =
        `🛍 <b>Yangi buyurtma!</b>\n\n` +
        `👤 <b>Mijoz:</b> ${order.customerName}\n` +
        `📞 <b>Telefon:</b> ${order.phone}\n` +
        `📍 <b>Manzil:</b> ${order.address || 'Ko‘rsatilmagan'}\n` +
        `💳 <b>To‘lov:</b> ${order.paymentMethod}\n` +
        `📦 <b>Mahsulotlar:</b>\n${itemsText || 'Ko‘rsatilmagan'}\n` +
        `💰 <b>Jami:</b> ${order.totalAmount} so'm`;

      bot.telegram.sendMessage(adminChatId, message, { parse_mode: 'HTML' }).catch(() => {});
    }

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: 'Buyurtmani saqlashda xatolik', details: err.message });
  }
});

// Bosh sahifa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Telegram Bot sozlamalari
let bot = null;
let adminChatId = null;

if (BOT_TOKEN) {
  bot = new Telegraf(BOT_TOKEN);

  bot.start((ctx) => {
    ctx.reply(
      `Assalomu alaykum! <b>VOLIDAM by Soliya</b> botiga xush kelibsiz.\n\n` +
        `Admin boshqaruvini faollashtirish uchun maxfiy parolni yuboring:`,
      { parse_mode: 'HTML' }
    );
  });

  bot.command('admin', (ctx) => {
    ctx.reply('Admin panelga kirish uchun maxfiy parolni yuboring:');
  });

  bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();

    if (text === SECRET_PASS) {
      adminChatId = ctx.chat.id;
      await ctx.reply(
        `✅ Admin rejimi yoqildi! Yangi buyurtmalar shu chatga keladi.`,
        Markup.keyboard([['📦 Buyurtmalar', '🛍 Mahsulotlar soni']]).resize()
      );
      return;
    }

    if (text === '📦 Buyurtmalar') {
      if (ctx.chat.id !== adminChatId) {
        return ctx.reply('Avval maxfiy parolni yuborib admin sifatida kiring.');
      }
      const orders = await Order.find().sort({ createdAt: -1 }).limit(5);
      if (!orders.length) {
        return ctx.reply('Hozircha buyurtmalar yo‘q.');
      }
      const list = orders
        .map(
          (o, i) =>
            `${i + 1}. <b>${o.customerName}</b> (${o.phone}) — ${o.totalAmount} so'm [${o.status}]`
        )
        .join('\n');
      return ctx.reply(`📋 <b>Oxirgi 5 ta buyurtma:</b>\n\n${list}`, { parse_mode: 'HTML' });
    }

    if (text === '🛍 Mahsulotlar soni') {
      const count = await Product.countDocuments();
      return ctx.reply(`Bazadagi mahsulotlar soni: <b>${count}</b> ta`, { parse_mode: 'HTML' });
    }
  });

  bot
    .launch()
    .then(() => {
      console.log('🤖 Telegram bot ishga tushdi');
    })
    .catch((err) => {
      console.error('⚠️ Telegram bot ishga tushmadi:', err.message);
    });
} else {
  console.log('⚠️ BOT_TOKEN kiritilmagan, bot o‘tkazib yuborildi');
}

app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT}-portda ishga tushdi`);
});
