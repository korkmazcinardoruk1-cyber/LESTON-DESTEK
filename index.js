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

// SMPTr Yetkili Ekip ROL ID'si
const YETKILI_ROL_ID = '1450817858094239946'; 

// (OPSİYONEL) Otomatik panel gönderilmesini istediğiniz KANAL ID'Sİ
const PANEL_KANAL_ID = ''; 

client.on('ready', async () => {
    console.log(`✅ SMPTr Botu (${client.user.tag}) başarıyla aktifleşti!`);

    if (PANEL_KANAL_ID) {
        try {
            const channel = await client.channels.fetch(PANEL_KANAL_ID);
            if (channel) {
                await sendTicketPanel(channel);
                console.log('✅ SMPTr Destek Paneli otomatik olarak kanala gönderildi!');
            }
        } catch (err) {
            console.error('Otomatik panel gönderilirken bir hata oluştu:', err);
        }
    }
});

// SMPTr Panel Oluşturma Fonksiyonu
async function sendTicketPanel(channel) {
    const embed = new EmbedBuilder()
        .setTitle('🛡️ SMPTr Destek Paneli')
        .setDescription(
            '**SMPTr** sunucusuna hoş geldiniz.\n\n' +
            'Aşağıdaki butonları kullanarak ihtiyacınıza uygun kategoriden **destek talebi** oluşturabilirsiniz.\n\n' +
            '**Destek Kategorileri:**\n' +
            '💬 **Genel Destek:** Genel konu ve sorularınız için\n' +
            '📥 **Ekip Alımı:** Ekibimize katılmak ve başvuru yapmak için\n' +
            '⚠️ **Şikayet:** Yaşadığınız olumsuz durumları ve bildirimleri iletmek için\n' +
            '❓ **Yardım:** Teknik yardım ve bilgi talepleriniz için'
        )
        .setColor('#2b2d31')
        .setFooter({ text: 'SMPTr Destek Sistemi' })
        .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_genel')
            .setLabel('Genel Destek')
            .setEmoji('💬')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId('ticket_ekip')
            .setLabel('Ekip Alımı')
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
        await interaction.reply({ content: '🔒 Destek talebiniz sonlandırılıyor, kanal 5 saniye içerisinde silinecektir...', ephemeral: true });
        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 5000);
        return;
    }

    // 2. TICKET AÇMA BUTONLARI
    const ticketTypes = {
        'ticket_genel': 'genel-destek',
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
            return interaction.reply({ content: `⚠️ Halihazırda açık durumda bir destek talebiniz bulunmaktadır: ${existingChannel}`, ephemeral: true });
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
                        ] // Sadece Yetkili Ekip görebilir
                    }
                ]
            });

            // Kanal İçi Karşılama Embed'i
            const ticketEmbed = new EmbedBuilder()
                .setTitle(`🎫 SMPTr - ${type.toUpperCase()} Talebi`)
                .setDescription(`Sayın ${user}, destek talebiniz başarıyla oluşturulmuştur.\nYetkili ekibimiz en kısa sürede size yardımcı olacaktır.\n\nTalebi sonlandırmak isterseniz aşağıdaki butonu kullanabilirsiniz.`)
                .setColor('#2b2d31')
                .setFooter({ text: 'SMPTr Destek Sistemi' })
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
            await interaction.editReply({ content: '❌ Destek kanalı oluşturulurken bir hata meydana geldi. Lütfen yetkili izinlerini kontrol ediniz.' });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
