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

// LESTON Yetkili Ekip ROL ID'si
const YETKILI_ROL_ID = '1450817858094239946'; 

// (OPSİYONEL) Otomatik panel gönderilmesini istediğin KANAL ID'Sİ
const PANEL_KANAL_ID = ''; 

client.on('ready', async () => {
    console.log(`✅ LESTON Botu (${client.user.tag}) başarıyla aktifleşti!`);

    if (PANEL_KANAL_ID) {
        try {
            const channel = await client.channels.fetch(PANEL_KANAL_ID);
            if (channel) {
                await sendTicketPanel(channel);
                console.log('✅ LESTON Destek Paneli otomatik olarak kanala atıldı!');
            }
        } catch (err) {
            console.error('Otomatik panel atılırken hata oluştu:', err);
        }
    }
});

// LESTON Panel Oluşturma Fonksiyonu
async function sendTicketPanel(channel) {
    const embed = new EmbedBuilder()
        .setTitle('⚔️ LESTON Destek Paneli')
        .setDescription(
            '**LESTON** ailesine ve sunucusuna hoş geldiniz!\n\n' +
            'Aşağıdaki butonları kullanarak ihtiyacınıza uygun kategoriden **destek bileti** oluşturabilirsiniz.\n\n' +
            '**Kategoriler:**\n' +
            '🤝 **Ally:** İttifak talepleri için\n' +
            '📥 **Ekip Alım:** Ailemize katılmak için\n' +
            '🔀 **Merge:** Sunucu/Ekip birleşme talepleri için\n' +
            '💼 **Partner:** Partnerlik ve iş birliği için'
        )
        .setColor('#2b2d31')
        .setFooter({ text: 'LESTON Destek Sistemi' })
        .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_ally')
            .setLabel('Ally')
            .setEmoji('🤝')
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId('ticket_ekip')
            .setLabel('Ekip Alım')
            .setEmoji('📥')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId('ticket_merge')
            .setLabel('Merge')
            .setEmoji('🔀')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId('ticket_partner')
            .setLabel('Partner')
            .setEmoji('💼')
            .setStyle(ButtonStyle.Danger)
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
        'ticket_ally': 'ally',
        'ticket_ekip': 'ekip',
        'ticket_merge': 'merge',
        'ticket_partner': 'partner'
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
                        ] // Sadece LESTON Yetkili Ekip görebilir
                    }
                ]
            });

            // Kanal İçi Karşılama Embed'i
            const ticketEmbed = new EmbedBuilder()
                .setTitle(`🎫 LESTON - ${type.toUpperCase()} Destek Talebi`)
                .setDescription(`Merhaba ${user}, destek talebiniz oluşturuldu.\nYetkili ekibimiz en kısa sürede sizinle ilgilenecektir.\n\nTalebi sonlandırmak için aşağıdaki butona basabilirsiniz.`)
                .setColor('#2b2d31')
                .setFooter({ text: 'LESTON Destek Sistemi' })
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
