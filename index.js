const express = require('express');
const puppeteer = require('puppeteer');
const { google } = require("googleapis");
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
require('dotenv').config();
const app = express();
const port = 4000;


async function readCsvAndExtractMlsNumbers(filePath, targetMlsNumber) {
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                if (row['MLS#'] === targetMlsNumber) {
                    resolve(row); 
                }
            })
            .on('end', () => {
                reject(new Error('MLS number not found'));
            })
            .on('error', (err) => {
                reject(err); 
            });
    });
}


app.get('/', (req, res) => {
    const fetch = async () => {
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized']
        });
        const auth = new google.auth.GoogleAuth({
            keyFile: "credentials.json",
            scopes: "https://www.googleapis.com/auth/spreadsheets",
        });
    
        const client = await auth.getClient();
        const googleSheets = google.sheets({ version: "v4", auth: client });
        const spreadsheetId = process.env.SPREADSHEET_ID;

        const page = await browser.newPage();
        const myclient = await page.target().createCDPSession();
        const downloadPath = process.env.DOWNLOAD_PATH || path.resolve(__dirname, 'downloads');
        await myclient.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadPath
        });
    
    
        await page.goto("https://firstmls.com/", {
            waitUntil: "domcontentloaded",
            headless: false,
        });
    
        //Xpaths for FMLS
        const loginButton = `(//li[contains(@class, 'menu_cta')]/a[@title='Member Login to FMLS Products'])[2]`;
        const userNameBtn = `(//input[contains(@class, 'form-control') and contains(@class, 'form__input-control')])[1]`
        const passBtn = `(//input[contains(@class, 'form-control') and contains(@class, 'form__input-control')])[2]`
        const submitBtn = `//button[@id='btn-login']`
        const matrixBtn = `(//a[contains(@class, 'product-item_productItem__7tSq-')])[8]`
        // const residentialBtn = `(//li[contains(@style, 'white-space: nowrap; float: none; width: auto;')])[11]`
        const selectAllCheckBoxes = `//a[text()='Select All']`
        const unselectAllCheckBoxes = `//a[text()='Select None']`
        //REMEBER : Check these boxes Active Under Contract = 3 , Pending = 4 ,  Closed = 8
        const checkBoxes = `//input[@name='Fm23_Ctrl106_LB']`
        //REMEMBER : Textboxes are from range [2] - [9]  , i fill 4th , 5th and 9th with (0-1)
        const textBoxes = `//input[@class='textbox']`
        const result = `//a[@id='m_ucSearchButtons_m_lbSearch' and .//span[text()='Results']]`
        const totalListings = `//span[@id='m_lblPagingSummary']//b[last()]`
        const pageNumSelector = `//select[@name='m_ucDisplayPicker$m_ddlPageSize']`
        const selectAllListings = `//a[@title='Check All']`
        const exportButton = `//a[@id='m_lbExport']`
        const exportCsv = `//*[@id="m_btnExport"]`
        const goBack = `//*[@id="m_btnBack"]`
        const MLSofListings = `//*[@id="wrapperTable"]/td[4]/span/a`
        const getCurrListNum = `//td[@class="d162m26"]//span[@class="wrapped-field"]`
        const clickSellerInfo = `(//*[@id="wrapperTable"]/tbody/tr/td/table/tbody/tr[6]/td[2]/span[2]/a)[2]`
        const getSellerEmail = `//td[@class="d19m16"]//a`
        const closeBtn = `//*[@id="m_aCloseWindow"]`
        const nextPage = `(//a[contains(text(), 'Next')])[2]`
        let totalNumofLists = 0;
        let currListNum = 0;
    
        await page.waitForXPath(loginButton)
        const [loginButtonXpath] = await page.$x(loginButton);
        try {
            if (loginButtonXpath) {
                await loginButtonXpath.click();
            }
    
            await page.waitForXPath(userNameBtn)
            await page.waitForXPath(passBtn)
            await page.waitForXPath(submitBtn)
    
    
            const [userNameBtnXpath] = await page.$x(userNameBtn);
            const [passBtnXpath] = await page.$x(passBtn);
            const [submitBtnXpath] = await page.$x(submitBtn);
            try {
                if (userNameBtnXpath) {
                    await userNameBtnXpath.type('MVDWING');
                }
                if (passBtnXpath) {
                    await passBtnXpath.type('PhoneBeasts');
                }
                if (submitBtnXpath) {
                    await submitBtnXpath.click();
                }
            } catch (error) {
                console.log(error);
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
            await page.waitForXPath(matrixBtn);
            const [matrixBtnXpath] = await page.$x(matrixBtn);
            if (matrixBtnXpath) {
                await page.evaluate((button) => {
                    button.setAttribute('target', '_self');
                }, matrixBtnXpath);
                await matrixBtnXpath.click();
            }
            await new Promise(resolve => setTimeout(resolve, 13000));
            await page.goto('https://matrix.fmlsd.mlsmatrix.com/Matrix/Search/Residential', { waitUntil: "domcontentloaded", });
    
            await page.waitForXPath(selectAllCheckBoxes);
            await page.waitForXPath(unselectAllCheckBoxes);
            const [unselectCheckBoxesXpath] = await page.$x(unselectAllCheckBoxes);
            if (unselectCheckBoxesXpath) {
                await new Promise(resolve => setTimeout(resolve, 4000));
                await page.evaluate(() => {
                    window.scrollBy(0, 500);
                });
                await new Promise(resolve => setTimeout(resolve, 3000));
                await unselectCheckBoxesXpath.click();
            }
    
            await page.waitForXPath(checkBoxes);
            await page.waitForXPath(textBoxes);
            const checkBoxesXpath = await page.$x(checkBoxes);
            const textBoxesXpath = await page.$x(textBoxes);
            await page.waitForXPath(result);
            const [resultXpath] = await page.$x(result);
            if (checkBoxesXpath) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                const checkboxesArray = [checkBoxesXpath[2], checkBoxesXpath[3], checkBoxesXpath[7]];
                await new Promise(resolve => setTimeout(resolve, 2000));
                for (const checkbox of checkboxesArray) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await checkbox.click();
                }
            }
            if (textBoxesXpath) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                await textBoxesXpath[3].evaluate(textBoxesXpath => textBoxesXpath.value = '')
                await textBoxesXpath[4].evaluate(textBoxesXpath => textBoxesXpath.value = '')
                await textBoxesXpath[8].evaluate(textBoxesXpath => textBoxesXpath.value = '')
                await new Promise(resolve => setTimeout(resolve, 2000));
                await textBoxesXpath[3].evaluate(textBoxesXpath => textBoxesXpath.value = '0-1')
                await textBoxesXpath[4].evaluate(textBoxesXpath => textBoxesXpath.value = '0-1')
                await textBoxesXpath[8].evaluate(textBoxesXpath => textBoxesXpath.value = '0-1')
            }
    
            if (resultXpath) {
                await resultXpath.click();
            }
            await new Promise(resolve => setTimeout(resolve, 15000));
            await page.waitForXPath(selectAllListings);
            await page.waitForXPath(exportButton);
            await page.waitForXPath(totalListings);
            const [totalListingsXpath] = await page.$x(totalListings);
    
            if (totalListingsXpath) {
                let text1 = await page.evaluate(element => element.innerText, totalListingsXpath);
                totalNumofLists = Number(text1);
            }
            const [selectAllListingsXpath] = await page.$x(selectAllListings);
            const [exportButtonXpath] = await page.$x(exportButton);
            if (pageNumSelector) {
                await selectAllListingsXpath.click();
                await new Promise(resolve => setTimeout(resolve, 2000));
                await page.select('select[id="m_ucDisplayPicker_m_ddlPageSize"]', '100');
                await new Promise(resolve => setTimeout(resolve, 10000));
                await exportButtonXpath.click();
                await new Promise(resolve => setTimeout(resolve, 10000));
                await page.select('select[id="m_ddExport"]', 'ud39051');
            }
            await page.waitForXPath(exportCsv);
            const [exportCsvXpath] = await page.$x(exportCsv);
            await new Promise(resolve => setTimeout(resolve, 2000));
            if (exportCsvXpath) {
                await exportCsvXpath.click()
                console.log("Csv Downloaded")
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
            await page.waitForXPath(goBack);
            const [goBackXpath] = await page.$x(goBack);
            if (goBackXpath) {
                await goBackXpath.click();
            }
            await new Promise(resolve => setTimeout(resolve, 10000));
    
            const filePath = path.join(__dirname, 'downloads', 'Agent Autopilot.csv');
            await page.waitForXPath(MLSofListings);
            const [MLSofListingsXpath] = await page.$x(MLSofListings);
            if (MLSofListingsXpath) {
                await MLSofListingsXpath.click();
            }
            for (let index = 0; index < totalNumofLists; index++) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                await page.waitForXPath(getCurrListNum);
                await page.waitForXPath(clickSellerInfo);
                const getCurrListNumXpath = await page.$x(getCurrListNum);
                const [clickSellerInfoXpath] = await page.$x(clickSellerInfo);
                if (getCurrListNumXpath) {
                    let text = await page.evaluate(element => element.innerText, getCurrListNumXpath[0]);
                    currListNum = text;
                } else {
                    console.log('Could not get List Number');
                }
                console.log("Current List : " + currListNum);
                await new Promise(resolve => setTimeout(resolve, 4000));
                if (clickSellerInfoXpath) {
                    await clickSellerInfoXpath.click();
                }
                await new Promise(resolve => setTimeout(resolve, 5000));
                const pages = await browser.pages();
    
                // Switch to the last tab (the newly opened tab)
                const lastPage = pages[pages.length - 1];
                await new Promise(resolve => setTimeout(resolve, 5000));
    
                await lastPage.waitForXPath(getSellerEmail);
                const [getSellerEmailXpath] = await lastPage.$x(getSellerEmail);
                await lastPage.waitForXPath(closeBtn);
                const [closeBtnXpath] = await lastPage.$x(closeBtn);
    
                let currSellerEmail = ''; 
                currSellerEmail = await lastPage.evaluate((getSellerEmailXpath) => {
                    if (getSellerEmailXpath) {
                        return getSellerEmailXpath.innerText; 
                    } else {
                        console.log('Could not get Seller"s email');
                        return '';
                    }
                }, getSellerEmailXpath);
                console.log("Curr Seller Email: " + currSellerEmail);
    
                await lastPage.evaluate((closeBtnXpath) => {
                    if (closeBtnXpath) {
                        closeBtnXpath.click()
                    } else {
                        console.log('Could not get Seller"s email');
                    }
                }, closeBtnXpath);
    
                await new Promise(resolve => setTimeout(resolve, 4000));
    
    
                readCsvAndExtractMlsNumbers(filePath, currListNum)
                    .then(row => {
                        let mlsNumber = row['MLS#'];
                        let status = row['Status'];
                        let streetNumber = row['Street Number'];
                        let streetName = row['Street Name'];
                        let streetSuffix = row['Street Suffix'];
                        let listAgentFullName = row['List Agent Full Name'];
                        let listAgentDirectWorkPhone = row['List Agent Direct Work Phone'];
                        let sellingAgentFullName = row['Selling Agent Full Name'];
                        let sellingAgentDirectWorkPhone = row['Selling Agent Direct Work Phone'];
                        let streetAddress = streetNumber + " " + streetName + " " + streetSuffix;
                        if (!sellingAgentFullName || !sellingAgentDirectWorkPhone) {
                            throw new Error('Selling Agent Full Name or Direct Work Phone is missing');
                        }
    
                        googleSheets.spreadsheets.values.append({
                            auth,
                            spreadsheetId,
                            range: "Sheet1!A:H",
                            valueInputOption: "RAW",
                            resource: {
                                values: [
                                    [
                                        mlsNumber,
                                        status,
                                        streetAddress,
                                        listAgentFullName,
                                        listAgentDirectWorkPhone,
                                        sellingAgentFullName,
                                        currSellerEmail, 
                                        sellingAgentDirectWorkPhone,
                                    ]
                                ]
                            },
                        }, (err, response) => {
                            if (err) {
                                console.error('The API returned an error: ' + err);
                            } else {
                                console.log("Data appended successfully");
                            }
                        });
                    })
                    .catch(err => {
                        console.error('Error:', err.message);
                    });
    
                await new Promise(resolve => setTimeout(resolve, 4000));
                await page.waitForXPath(nextPage);
                const [nextPageXpath] = await page.$x(nextPage);
                if (nextPageXpath) {
                    await nextPageXpath.click()
                }
    
            }
            
            await browser.close();
            res.send('Done');
            process.exit();
            
        } catch (error) {
            console.log(error)
        }
    }
    
    fetch();
})


app.listen(port, () => {
    console.log(`Scrapper listening on port ${port}`);
});


