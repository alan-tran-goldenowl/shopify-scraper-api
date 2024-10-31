import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async getResponse(url) {
    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch({});
    const page = await browser.newPage();
    // Navigate the page to a URL.
    await page.goto(url);
    // Set screen size.
    await page.setViewport({ width: 1080, height: 1024 });

    // get all buttons type submit
    const submitButtons = await page.$$(
      'button[type="submit"], input[type="submit"]',
    );

    if (submitButtons.length === 0) {
      return;
    }

    const submitButton = (
      await Promise.all(
        submitButtons.map(async (button) => {
          const boundingBox = await button.boundingBox();
          const width = boundingBox?.width ?? 0;
          const height = boundingBox?.height ?? 0;
          return {
            element: button,
            area: width * height,
          };
        }),
      )
    ).sort((a, b) => b.area - a.area)[0].element; // get largest button

    const allComputedStyles = await page.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      const allStyles = {};
      for (let i = 0; i < styles.length; i++) {
        const propertyName = styles[i];
        allStyles[propertyName] = styles.getPropertyValue(propertyName);
      }
      return allStyles;
    }, submitButton);

    // Extract font URLs from @font-face rules
    const fontUrls = await page.evaluate(() => {
      const rules = [];
      const styleSheets = Array.from(document.styleSheets);

      styleSheets.forEach((sheet) => {
        try {
          const cssRules = Array.from(sheet.cssRules);
          cssRules.forEach((rule) => {
            if (rule instanceof CSSFontFaceRule) {
              rules.push({
                fontFamily: rule.style.fontFamily,
                src: rule.style.getPropertyValue('src'),
              });
            }
          });
          console.log(rules);
        } catch (e) {
          // Handle potential CORS errors when accessing stylesheets from different origins
          console.warn('Could not access stylesheet:', e);
        }
      });
      return rules;
    });

    // Extract text content from all <span> and <p> elements
    const textElementStyles = await page.evaluate(() => {
      // Select both <span> and <p> elements
      const elements = document.querySelectorAll('span, p');
      const arrTextElements = [];

      elements.forEach((el) => {
        const text = el.textContent.trim();
        if (text) {
          // Only add non-empty text
          const styles = window.getComputedStyle(el);
          const allStyles = {};
          for (let i = 0; i < styles.length; i++) {
            const propertyName = styles[i];
            allStyles[propertyName] = styles.getPropertyValue(propertyName);
          }
          arrTextElements.push(allStyles);
        }
      });

      return arrTextElements;
    });

    return {
      fonts: textElementStyles.map((textElement) => ({
        ...textElement,
        url: fontUrls.find((url) =>
          textElement?.['font-family'].includes(url.fontFamily),
        )?.src,
      })),
      primaryButton: allComputedStyles,
    };
  }
}
