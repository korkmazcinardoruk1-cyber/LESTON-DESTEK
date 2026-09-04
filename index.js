const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionFlagsBits 
} = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

// Leston Yetkili Ekip ROL ID'si
const YETKILI_ROL_ID = '1450817858094239946'; 

// (OPSİYONEL) Otomatik panel gönderilmesini istediğin KANAL ID'Sİ
const PANEL_KANAL_ID = ''; 

client.on('ready', async () => {
    console.log(`✅ Leston Botu (${client.user.tag}) başarıyla aktifleşti!`);

    if (PANEL_KANAL_ID) {
        try {
            const channel = await client.channels.fetch(PANEL_KANAL_ID);
            if (channel) {
                await sendTicketPanel(channel);
                console.log('✅ Leston Destek Paneli otomatik olarak kanala atıldı!');
            }
        } catch (err) {
            console.error('Otomatik panel atılırken hata oluştu:', err);
        }
    }
});

// Leston Panel Oluşturma Fonksiyonu
async function sendTicketPanel(channel) {
    const embed = new EmbedBuilder()
        .setTitle('⚔️ Leston Destek Paneli')
        .setDescription(
            '**Leston** ailesine ve sunucusuna hoş geldiniz!\n\n' +
            'Aşağıdaki butonları kullanarak ihtiyacınıza uygun kategoriden **destek bileti** oluşturabilirsiniz.\n\n' +
            '**Kategoriler:**\n' +
            '📥 **Ekip Alım:** Ailemize katılmak için\n' +
            '⚠️ **Şikayet:** Şikayet ve bildirimleriniz için\n' +
            '❓ **Yardım:** Genel yardım ve destek için'
        )
        .setColor('#2b2d31')
        .setFooter({ text: 'Leston Destek Sistemi' })
        .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_ekip')
            .setLabel('Ekip Alım')
            .setEmoji('📥')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId('ticket_sikayet')
            .setLabel('Şikayet')
            .setEmoji('⚠️')
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId('ticket_yardim')
            .setLabel('Yardım')
            .setEmoji('❓')
            .setStyle(ButtonStyle.Primary)
    );

    await channel.send({
        embeds: [embed],
        components: [buttons]
    });
}

// Komut ile Kurma (!ticket-kur)
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.trim() === '!ticket-kur') {
        await sendTicketPanel(message.channel);
        if (message.deletable) message.delete().catch(() => {});
    }
});

// Buton Etkileşimleri (Kanal Açma / Kapatma)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const { customId, guild, user } = interaction;

    // 1. TICKET KAPATMA BUTONU
    if (customId === 'close_ticket') {
        await interaction.reply({ content: '🔒 Destek talebi kapatılıyor, kanal 5 saniye içinde silinecektir...', ephemeral: true });
        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 5000);
        return;
    }

    // 2. TICKET AÇMA BUTONLARI
    const ticketTypes = {
        'ticket_ekip': 'ekip',
        'ticket_sikayet': 'sikayet',
        'ticket_yardim': 'yardim'
    };

    if (ticketTypes[customId]) {
        const type = ticketTypes[customId];
        const channelName = `${type}-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

        // Zaten açık bileti var mı kontrolü
        const existingChannel = guild.channels.cache.find(c => c.name === channelName);
        if (existingChannel) {
            return interaction.reply({ content: `⚠️ Zaten açık bir talebiniz bulunuyor: ${existingChannel}`, ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Gizli Özel Kanal Oluşturma
            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel] // Herkese kapat
                    },
                    {
                        id: user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel, 
                            PermissionFlagsBits.SendMessages, 
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.ReadMessageHistory
                        ] // Bileti açan görebilir
                    },
                    {
                        id: YETKILI_ROL_ID,
                        allow: [
                            PermissionFlagsBits.ViewChannel, 
                            PermissionFlagsBits.SendMessages, 
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.ReadMessageHistory
                        ] // Sadece Leston Yetkili Ekip görebilir
                    }
                ]
            });

            // Kanal İçi Karşılama Embed'i
            const ticketEmbed = new EmbedBuilder()
                .setTitle(`🎫 Leston - ${type.toUpperCase()} Destek Talebi`)
                .setDescription(`Merhaba ${user}, destek talebiniz oluşturuldu.\nYetkili ekibimiz en kısa sürede sizinle ilgilenecektir.\n\nTalebi sonlandırmak için aşağıdaki butona basabilirsiniz.`)
                .setColor('#2b2d31')
                .setFooter({ text: 'Leston Destek Sistemi' })
                .setTimestamp();

            const closeButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Talebi Kapat')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Danger)
            );

            // Kanala Yetkili Rolü Etiketleyip Mesaj Atma
            await ticketChannel.send({
                content: `<@&${YETKILI_ROL_ID}> | ${user}`,
                embeds: [ticketEmbed],
                components: [closeButton]
            });

            await interaction.editReply({ content: `✅ Destek kanalınız oluşturuldu: ${ticketChannel}` });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Kanal oluşturulurken bir hata oluştu. Lütfen botun rol izinlerini (Manage Channels) kontrol edin.' });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
