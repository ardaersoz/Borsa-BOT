const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const arzlar = require('./arzlar'); // arzlar.js dosyasını içe aktarın
const duyurular = require('./duyurular'); // duyurular.js dosyasını içe aktarın
const kur = require('./kur'); // kur.js dosyasını içe aktarın
const config = require('./config.json');
const analiz = require('./analiz'); // analiz.js dosyasını içe aktarın

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Create a REST client to handle command registration
const rest = new REST({ version: '10' }).setToken(config.token);

// Bot hazır olduğunda tetiklenir
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Discord API'si için slash komutlarını kaydetme
    (async () => {
        try {
            await rest.put(Routes.applicationGuildCommands(client.user.id, config.guildId), {
                body: [
                    new SlashCommandBuilder()
                        .setName('halkarz')
                        .setDescription('Halka Arz olan hisseleri görüntüleyin.')
                        .addStringOption(option =>
                            option.setName('hisse')
                                .setDescription('Hisse adı veya BIST kodu')
                                .setRequired(true)
                        ),
                    new SlashCommandBuilder()
                        .setName('duyurular')
                        .setDescription('Son duyuruları gösterir.'),
                    new SlashCommandBuilder()
                        .setName('kur')
                        .setDescription('BIST kodu ile hisse fiyat bilgilerini görüntüleyin.')
                        .addStringOption(option =>
                            option.setName('bistkodu')
                                .setDescription('BIST kodu')
                                .setRequired(true)
                        ),
                    new SlashCommandBuilder()
                        .setName('analiz')
                        .setDescription('Şirketlerin son dakika siteye sunduğu analizleri görüntüleyin.'),
                    new SlashCommandBuilder()
                        .setName('yeniarz')
                        .setDescription('Bu komutu kullanarak halka arz sitesindeki en güncel 3 halka arz olan hisseleri görebilirsiniz.'),
                ],
            });
            console.log('Successfully registered application commands.');
        } catch (error) {
            console.error('Error registering application commands:', error);
        }
    })();
});

// Mesaj geldiğinde tetiklenir
client.on('messageCreate', (message) => {
    // Eğer botun kendi mesajıysa geri dön
    if (message.author.bot) return;

    // Eğer mesaj 'yapımcı' içeriyorsa
    if (message.content.toLowerCase() === 'yapımcı') {
        // Yapımcı sitesinin URL'si
        const devUrl = 'https://ardaersoz.github.io/softwareblog/';

        // Komuttan sonra ne yazılacağını gösterir
        message.reply(`İstenilen site: ${devUrl}`);
    }
});

// Slash komutlarını dinleme
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    // 'halkarz' komutu
    if (commandName === 'halkarz') {
        const hisseAdi = options.getString('hisse');
        if (!hisseAdi) {
            return interaction.reply({ content: 'Lütfen geçerli bir hisse adı girin.', ephemeral: true });
        }
        try {
            await interaction.deferReply();
            const data = await arzlar();
            const filteredData = data.filter(arz =>
                (arz.halkaArzSirket && arz.halkaArzSirket.toLowerCase().includes(hisseAdi.toLowerCase())) ||
                (arz.bistKodu && arz.bistKodu.toLowerCase() === hisseAdi.toLowerCase())
            );
            if (filteredData.length > 0) {
                const embeds = filteredData.map(arz => new EmbedBuilder()
                    .setTitle('Halka Arz olan şirketlerin durumları.')
                    .setDescription(`Hisse: ${arz.halkaArzSirket || 'Bilinmiyor'}`)
                    .addFields(
                        { name: 'BIST Kodu', value: arz.bistKodu || 'Bilinmiyor', inline: true },
                        { name: 'İşlem Tarihi', value: arz.halkaArzTarihi || 'Bilinmiyor', inline: true },
                        { name: 'Fiyat', value: arz.halkaArzFiyati || 'Yok', inline: true },
                        { name: 'Dağıtım Yöntemi', value: arz.dagitimYontemi || 'Yok', inline: true },
                        { name: 'Pay', value: arz.pay || 'Yok', inline: true },
                        { name: 'Aracı Kurum', value: arz.araciKurum || 'Yok', inline: true },
                        { name: 'Pazar', value: arz.pazar || 'Yok', inline: true },
                        { name: 'Miktar', value: arz.miktar || 'Yok', inline: true }
                    )
                    .setColor(0x00AE86)
                    .setTimestamp()
                );
                const reply = await interaction.editReply({ embeds });
                setTimeout(() => {
                    reply.delete().catch(console.error);
                }, 120000); // 2 dakika sonra mesajı sil
            } else {
                await interaction.editReply({ content: `'${hisseAdi}' isimli hisse için açık arz bulunamadı.`, ephemeral: true });
            }
        } catch (error) {
            console.error(`Error fetching data for '${hisseAdi}':`, error);
            await interaction.editReply({ content: 'Veri alınırken bir hata oluştu.', ephemeral: true });
        }
    } else if (commandName === 'duyurular') {
        try {
            await interaction.deferReply();
            const data = await duyurular();
            const embed = new EmbedBuilder()
                .setTitle('Son Duyuru')
                .setDescription(data.icerik || 'İçerik bulunamadı.')
                .addFields(
                    { name: 'Başlık', value: data.baslik || 'Bilinmiyor', inline: true },
                    { name: 'İşlem Tarihi', value: data.islemTarihi || 'Bilinmiyor', inline: true }
                )
                .setColor(0x00AE86)
                .setTimestamp();
            const reply = await interaction.editReply({ embeds: [embed] });
            setTimeout(() => {
                reply.delete().catch(console.error);
            }, 120000);
        } catch (error) {
            console.error('Error handling /duyurular command:', error);
            await interaction.reply({ content: 'Veri alınırken bir hata oluştu.', ephemeral: true });
        }
    } else if (commandName === 'kur') {
        const bistKodu = options.getString('bistkodu');
        if (!bistKodu) {
            return interaction.reply({ content: 'Lütfen geçerli bir BIST kodu girin.', ephemeral: true });
        }
        try {
            await interaction.deferReply();
            const data = await kur(bistKodu);
            const embed = new EmbedBuilder()
                .setTitle('Hisse Bilgileri')
                .addFields(
                    { name: 'Firma Adı', value: data.firmaAdi || 'Bilinmiyor', inline: true },
                    { name: 'Önceki Fiyat', value: data.oncekiFiyat || 'Bilinmiyor', inline: true },
                    { name: 'Güncel Fiyat', value: data.guncelFiyat || 'Bilinmiyor', inline: true },
                    { name: 'Yüzde Değişim', value: data.oran || 'Bilinmiyor', inline: true }
                )
                .setColor(0x00AE86)
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(`Error fetching data for '${bistKodu}':`, error);
            await interaction.editReply({ content: 'Veri alınırken bir hata oluştu.', ephemeral: true });
        }
    } else if (commandName === 'analiz') {
        try {
            await interaction.deferReply();
            const data = await analiz();
            const embed = new EmbedBuilder()
                .setTitle(data.baslik || 'Başlık bulunamadı')
                .setURL(data.url || 'https://halkarz.com/analizler/')
                .setDescription(data.icerik || 'İçerik bulunamadı.')
                .addFields(
                    { name: 'İşlem Tarihi', value: data.islemTarihi || 'Bilinmiyor', inline: true }
                )
                .setColor(0x00AE86)
                .setTimestamp();
            const reply = await interaction.editReply({ embeds: [embed] });
        } catch (error) {
                console.error(`Error fetching data for '${bistKodu}':`, error);
                await interaction.editReply({ content: 'Veri alınırken bir hata oluştu.', ephemeral: true });
        }
    } else if (commandName === 'yeniarz') {
        try {
            await interaction.deferReply();
            const data = await arzlar();
            const recentArz = data.slice(0, 3); // İlk 3 halka arz
            const embeds = recentArz.map(arz => new EmbedBuilder()
                .setTitle('En Güncel Halka Arzlar')
                .setDescription(`Hisse: ${arz.halkaArzSirket || 'Bilinmiyor'}`)
                .addFields(
                    { name: 'BIST Kodu', value: arz.bistKodu || 'Bilinmiyor', inline: true },
                    { name: 'İşlem Tarihi', value: arz.halkaArzTarihi || 'Bilinmiyor', inline: true },
                    { name: 'Fiyat', value: arz.halkaArzFiyati || 'Yok', inline: true },
                    { name: 'Dağıtım Yöntemi', value: arz.dagitimYontemi || 'Yok', inline: true },
                    { name: 'Pay', value: arz.pay || 'Yok', inline: true },
                    { name: 'Aracı Kurum', value: arz.araciKurum || 'Yok', inline: true },
                    { name: 'Pazar', value: arz.pazar || 'Yok', inline: true },
                    { name: 'Miktar', value: arz.miktar || 'Yok', inline: true }
                )
                .setColor(0x00AE86)
                .setTimestamp()
            );
            await interaction.editReply({ embeds });
        } catch (error) {
            console.error('Error handling /yeniarz command:', error);
            await interaction.reply({ content: 'Veri alınırken bir hata oluştu.', ephemeral: true });
        }
    }
});

client.login(config.token);
