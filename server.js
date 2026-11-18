const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const path = require('path');
const mongoose = require('mongoose');

// Telegram bot tokening
const BOT_TOKEN = process.env.BOT_TOKEN;
// Admin panelga kirish maxfiy paroli
const SECRET_PASS = process.env.SECRET_PASS;

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Order Schema
const Order = mongoose.model('Order', new mongoose.Schema({
    message: String,
    timestamp: { type: Date, default: Date.now }
}));

// Saytni ochib berish
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Adminlar ro'yxati (bu memoryda qoladi, har launchda reset bo'ladi)
const admins = new Set();

// Botni yaratish
const bot = new Telegraf(BOT_TOKEN);

// Botni boshlash
bot.start((ctx) => {
    if (admins.has(ctx.chat.id)) {
        return ctx.reply(
            "✅ Siz admin sifatida ulangansiz. Yangi zakazlar shu yerga keladi.",
            Markup.keyboard([['📦 Oxirgi zakazlar', '🗑 Tozalash'], ['🚪 Chiqish']]).resize()
        );
    }
    ctx.reply("🔒 Yopiq tizim! Do'kon xodimi bo'lsangiz, maxfiy parolni yuboring:");
});

// Parol tekshirish
bot.hears(SECRET_PASS, (ctx) => {
    admins.add(ctx.chat.id);
    ctx.deleteMessage().catch(() => {});
    ctx.reply(
        "✅ Muvaffaqiyatli ulandingiz! Endi saytdan tushgan zakazlar shu yerga keladi.",
        Markup.keyboard([['📦 Oxirgi zakazlar', '🗑 Tozalash'], ['🚪 Chiqish']]).resize()
    );
});

// Zakazlarni ko'rish
bot.hears('📦 Oxirgi zakazlar', async (ctx) => {
    if (!admins.has(ctx.chat.id)) return ctx.reply("⛔️ Ruxsat yo'q! Parolni yuboring.");
    
    try {
        const orders = await Order.find().sort({ timestamp: -1 }).limit(10);
        
        if (orders.length === 0) return ctx.reply("📭 Hozircha yangi zakazlar yo'q.");
        
        const text = orders.map(order => order.message).reverse().join('\n\n-------------------\n\n');
        ctx.reply(`📋 *Oxirgi zakazlar:*\n\n${text}`, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error("Orders fetching error:", error);
        ctx.reply("❌ Buyurtmalarni olishda xatolik.");
    }
});

// Tozalash
bot.hears('🗑 Tozalash', async (ctx) => {
    if (!admins.has(ctx.chat.id)) return;
    try {
        await Order.deleteMany({});
        ctx.reply("🗑 Zakazlar tarixi tozalandi!");
    } catch (error) {
        console.error("Orders cleaning error:", error);
        ctx.reply("❌ Buyurtmalarni tozalashda xatolik.");
    }
});

// Chiqish
bot.hears('🚪 Chiqish', (ctx) => {
    admins.delete(ctx.chat.id);
    ctx.reply("🔒 Admin rejimidan chiqdingiz.", Markup.removeKeyboard());
});

// Boshqa narsa yozsa
bot.on('text', (ctx) => {
    if (!admins.has(ctx.chat.id)) {
        ctx.reply("⛔️ Noto'g'ri buyruq! Bu bot faqat do'kon egasi uchun.");
    }
});

// Saytdan zakaz qabul qilish API
app.post('/api/order', async (req, res) => {
    try {
        const { name, phone, address, total, cart } = req.body;

        if (!name || !phone || !address || !cart || cart.length === 0) {
            return res.status(400).json({ success: false, error: "Ma'lumotlar to'liq emas!" });
        }

        let msg = `🚨 *YANGI BUYURTMA TUSHDI!*\n\n`;
        msg += `👤 *Mijoz ismi:* ${name}\n`;
        msg += `📞 *Telefon:* ${phone}\n`;
        msg += `📍 *Manzil:* ${address}\n\n`;
        msg += `🛍 *Kiyimlar:*\n`;

        cart.forEach((item, index) => {
            msg += `${index + 1}. ${item.title} — ${item.price} (${item.quantity} ta)\n`;
        });

        msg += `\n💰 *Jami summa:* ${total}`;

        // DB save
        await Order.create({ message: msg });

        // Barcha ulangan adminlarga yuborish
        for (const adminId of admins) {
            await bot.telegram.sendMessage(adminId, msg, { parse_mode: 'Markdown' }).catch(() => {});
        }

        res.json({ success: true, message: "Zakaz qabul qilindi!" });
    } catch (error) {
        console.error("Xatolik:", error);
        res.status(500).json({ success: false, error: "Server xatosi" });
    }
});

// Ishga tushirish
bot.launch()
    .then(() => {
        console.log("🤖 Telegram bot muvaffaqiyatli ishga tushdi!");
    })
    .catch(err => console.error('Telegram bot launch error:', err));

app.listen(PORT, () => {
    console.log(`🌐 Sayt ishga tushdi: http://localhost:${PORT}`);
});
