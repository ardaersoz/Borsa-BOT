const axios = require("axios");
const cheerio = require("cheerio");
const { EmbedBuilder } = require('discord.js');

const arzlarEmbed = async () => {
  let data = [];
  try {
    const response = await axios.get("https://halkarz.com/");
    const $ = cheerio.load(response.data);
    
    const articles = $("article.index-list").slice(0, 3); // En son çıkan 3 halka arzı alıyoruz
    const fetchPromises = articles.map(async (index, article) => {
      const $article = $(article);
      const link = $article.find("h3.il-halka-arz-sirket a").attr("href");

      if (link) {
        try {
          const newResponse = await axios.get(link);
          const $$ = cheerio.load(newResponse.data);
          const halkaArzSirket = $$('.il-halka-arz-sirket').text().trim();
          const halkaArzBilgileri = $$('.il-content .il-b').text().trim();
          const halkaArzTarihi = $$("tr.font-16 td time").text().trim();

          data.push({
            halkaArzSirket,
            halkaArzBilgileri,
            halkaArzTarihi
          });
        } catch (error) {
          console.error(`Error fetching details from link ${link}:`, error);
        }
      }
    }).get(); // .get() to convert to array

    await Promise.all(fetchPromises);

    // Embed mesajını oluşturuyoruz
    if (data.length > 0) {
      const embeds = data.map(arz => new EmbedBuilder()
        .setTitle('Halka Arz Bilgileri')
        .setDescription(`Şirket: ${arz.halkaArzSirket}`)
        .addFields(
          { name: 'Bilgiler', value: arz.halkaArzBilgileri || 'Bilgi yok', inline: false },
          { name: 'Tarih', value: arz.halkaArzTarihi || 'Tarih yok', inline: false }
        )
        .setColor(0x00AE86)
        .setTimestamp()
      );
      
      return embeds;
    } else {
      return [{ description: 'Herhangi bir halka arz bulunamadı.' }];
    }
  } catch (error) {
    console.error('Error fetching data from the main page:', error);
    return [{ description: 'Veri alınırken bir hata oluştu.' }];
  }
};

module.exports = arzlarEmbed;
