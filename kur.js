const puppeteer = require('puppeteer');

module.exports = async (bistKodu) => {
    try {
        if (!bistKodu || typeof bistKodu !== 'string') {
            return { error: "404", text: "Bist Kodu Girilmedi!" };
        }

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(`https://tr.tradingview.com/chart/?symbol=BIST%3A${bistKodu.toUpperCase()}`, {  

            waitUntil: 'networkidle2'
        });

        // TradingView sayfasındaki dinamik içerikleri yüklemek için biraz bekleyin
        await page.waitForTimeout(5000); // 5 saniye kadar bekleyebilirsiniz, ihtiyaca göre ayarlayın

        const data = await page.evaluate(() => {
            let oncekiFiyat = document.querySelector('.sellButton-hw_3o_pb span.buttonText-hw_3o_pb')?.innerText.trim() || 'Bilinmiyor';
            let guncelFiyat = document.querySelector('.buyButton-hw_3o_pb span.buttonText-hw_3o_pb')?.innerText.trim() || 'Bilinmiyor';
            let oran = document.querySelector('.spread-hw_3o_pb')?.innerText.trim() || 'Bilinmiyor';
            let firmaAdi = document.querySelector('.title-l31H9iuA')?.innerText.trim() || 'Bilinmiyor';

            return { oncekiFiyat, guncelFiyat, oran, firmaAdi };
        });

        await browser.close();

        var obj = { bistKodu, ...data };
        return obj;

    } catch (err) {
        console.error('Puppeteer error:', err);
        return { error: "404", text: "Girilen Bist Kodu Borsa Üzerinde Bulunamadı!" };
    }
};
