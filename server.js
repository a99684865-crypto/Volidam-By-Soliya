const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const path = require('path');
const mongoose = require('mongoose');

const BOT_TOKEN = process.env.BOT_TOKEN || '9076791095:AAElEEUK4ChCRsx-kpFpniA-3xjJqBS5JlU';
const SECRET_PASS = process.env.SECRET_PASS || process.env.VOLIDAM00 || 'volidam777';
const MONGODB_URI = process.env.MONGODB_URI;

const PORT = process.env.PORT || 3000;
const app = express();

if (!MONGODB_URI) {
    throw new Error('MONGODB_URI topilmadi!');
}

app.use(express.json());
app.use(express.static(__dirname));

const Order = mongoose.model('Order', new mongoose.Schema({
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const admins = new Set();
const bot = new Telegraf(BOT_TOKEN);

const adminKeyboard = Markup.keyboard([
    ['📦 Oxirgi zakazlar', '🗑 Tozalash'],
    ['🚪 Chiqish']
]).resize();

bot.start((ctx) => {
    if (admins.has(ctx.chat.id)) {
        return ctx.reply('✅ Siz admin sifatida ulangansiz.', adminKeyboard);
    }
    return ctx.reply('🔒 Yopiq tizim! Maxfiy parolni yuboring:');
});

bot.on('text', async (ctx, next) => {
    if (ctx.message.text === SECRET_PASS) {
        admins.add(ctx.chat.id);
        try {
            await ctx.deleteMessage();
        } catch (_) {}
        return ctx.reply('✅ Muvaffaqiyatli ulandingiz!', adminKeyboard);
    }
    return next();
});

bot.hears('📦 Oxirgi zakazlar', async (ctx) => {
    if (!admins.has(ctx.chat.id)) {
        return ctx.reply("⛔ Ruxsat yo'q!");
    }

    try {
        const orders = await Order.find().sort({ timestamp: -1 }).limit(10);
        if (!orders.length) {
            return ctx.reply("📭 Hozircha zakazlar yo'q.");
        }

        const message = orders
            .map(order => order.message)
            .reverse()
            .join('\n\n-------------------\n\n');

        return ctx.reply(`📋 Oxirgi zakazlar:\n\n${message}`);
    } catch (error) {
        console.error(error);
        return ctx.reply('❌ Xatolik yuz berdi.');
    }
});

bot.hears('🗑 Tozalash', async (ctx) => {
    if (!admins.has(ctx.chat.id)) return;

    try {
        await Order.deleteMany({});
        return ctx.reply('🗑 Zakazlar tarixi tozalandi!');
    } catch (error) {
        console.error(error);
        return ctx.reply('❌ Xatolik!');
    }
});

bot.hears('🚪 Chiqish', (ctx) => {
    admins.delete(ctx.chat.id);
    return ctx.reply('🔒 Admin rejimidan chiqdingiz.', Markup.removeKeyboard());
});

app.post('/api/order', async (req, res) => {
    try {
        const { name, phone, address, total, cart, items } = req.body || {};
        const orderItems = Array.isArray(cart) ? cart : Array.isArray(items) ? items : [];

        if (!name || !phone || !address || orderItems.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Ma'lumotlar to'liq emas!"
            });
        }

        let msg = '🚨 YANGI BUYURTMA TUSHDI!\n\n';
        msg += `👤 Mijoz: ${name}\n`;
        msg += `📞 Telefon: ${phone}\n`;
        msg += `📍 Manzil: ${address}\n\n`;
        msg += '🛍 Kiyimlar:\n';

        orderItems.forEach((item, index) => {
            if (typeof item === 'string') {
                msg += `${index + 1}. ${item}\n`;
            } else {
                msg += `${index + 1}. ${item.title || item.name || 'Mahsulot'} — ${item.price ?? ''} (${item.quantity ?? item.qty ?? 1} ta)\n`;
            }
        });

        msg += `\n💰 Jami: ${total ?? ''}`;

        await Order.create({ message: msg });

        for (const adminId of admins) {
            try {
                await bot.telegram.sendMessage(adminId, msg);
            } catch (error) {
                console.error(error);
            }
        }

        return res.json({
            success: true,
            message: 'Zakaz qabul qilindi!'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});

async function startServer() {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    await bot.launch();
    console.log('🤖 Telegram bot ishga tushdi!');

    app.listen(PORT, () => {
        console.log(`🌐 Server: http://localhost:${PORT}`);
    });
}

startServer().catch(error => {
    console.error('Server xatosi:', error);
    process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
