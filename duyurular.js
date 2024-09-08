const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fetches and returns the latest announcement data from the provided URL.
 * @returns {Promise<Object>} - An object containing announcement details.
 */
module.exports = async () => {
    try {
        // Fetch the announcements page
        const res = await axios.get("https://halkarz.com/haberler/");
        const $ = cheerio.load(res.data);

        // Get the URL for the latest announcement
        const latestAnnouncementUrl = $(`#getin > section > ul:nth-child(2) > li > article > div > h3 > a`).attr("href");
        if (!latestAnnouncementUrl) {
            throw new Error('Latest announcement URL not found.');
        }

        // Fetch the details of the latest announcement
        const res2 = await axios.get(latestAnnouncementUrl);
        const $$ = cheerio.load(res2.data);

        // Extract announcement details
        const firmaAdi = $$("#getin > article.index-list.detail-page.duyurular-page-single > div > h1").text().trim();
        const bistKodu = $$("#getin > article.index-list.detail-page.duyurular-page-single > div > h1").text().trim();
        const baslik = $$("#getin > article.duyurular-post-wrap > article > p:nth-child(3)").text().trim();
        const icerik = $$("#getin > article.duyurular-post-wrap > article > p:nth-child(4)").text().trim();
        const islemTarihi = $$("#getin > article.index-list.detail-page.duyurular-page-single > div > div > time").text().trim();

        // Return the announcement details as an object
        return {
            firmaAdi,
            bistKodu,
            baslik,
            icerik,
            islemTarihi,
            url: latestAnnouncementUrl
        };
    } catch (error) {
        console.error('Error fetching announcement data:', error);
        return { error: 'Error fetching data', details: error.message };
    }
};
