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

const fetch = async () => {
    console.log("Starting Scrapper")
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
    });

    console.log("Execution Going on")

    //Xpaths for FMLS
    const loginButton = '#top-menu > li.menu_cta.menu-item.menu-item-type-custom.menu-item-object-custom.menu-item-872 > a';
    const userNameBtn = 'input.form-control.form__input-control:nth-child(2)'
    const passBtn = 'input.form-control.form__input-control:nth-child(1)'
    const submitBtn = 'button#btn-login'
    const matrixBtn = '#root > div.contentWrapper > div.body_body__1Ourk.undefined > div > div > div:nth-child(2) > div > div.responsiveness-columns_width66__1fgLg.layout-wrapper_layoutWrapper__2IT_n.column-layout_layoutWrapper__1p42U > div:nth-child(3) > div > div > div > a:nth-child(1)'
    // const residentialBtn = `(//li[contains(@style, 'white-space: nowrap; float: none; width: auto;')])[11]`
    const unselectAllCheckBoxes = '#S_MultiStatus_Select_None > a'
    //REMEBER : Check these boxes Active Under Contract = 3 , Pending = 4 ,  Closed = 8
    const checkBoxes = 'input[name="Fm23_Ctrl106_LB"]'
    //REMEMBER : Textboxes are from range [2] - [9]  , i fill 4th , 5th and 9th with (0-1)
    const textBoxes = 'input.textbox'
    const result = '#m_ucSearchButtons_m_lbSearch'
    const totalListings = 'span#m_lblPagingSummary b:last-child'
    const pageNumSelector = 'select[name="m_ucDisplayPicker$m_ddlPageSize"]'
    const selectAllListings = 'a[title="Check All"]'
    const exportButton = 'a#m_lbExport'
    const exportCsv = '*#m_btnExport'
    const goBack = '*#m_btnBack'
    const MLSofListings = '#wrapperTable > td.dU39611m8 > span > a'
    const getCurrListNum = '#wrapperTable > tbody > tr > td > table > tbody > tr:nth-child(5) > td.d162m26 > span.wrapped-field'
    const clickSellerInfo = '#wrapperTable > tbody > tr > td > table > tbody > tr:nth-child(6) > td.d168m13 > span.formula.field.d168m19 > a'
    const getSellerEmail = 'td.d19m16 a'
    const closeBtn = '#m_aCloseWindow'
    const nextPage = '#m_upPaging > span > a:nth-child(11)'
    let totalNumofLists = 0;
    let currListNum = 0;
    let SellerFlag = true;

    await page.waitForSelector(loginButton)
    const loginButtonXpath = await page.$(loginButton);
    try {
        if (loginButtonXpath) {
            await loginButtonXpath.click();
        }

        await page.waitForSelector(userNameBtn)
        await page.waitForSelector(passBtn)
        await page.waitForSelector(submitBtn)


        const userNameBtnXpath = await page.$(userNameBtn);
        const passBtnXpath = await page.$(passBtn);
        const submitBtnXpath = await page.$(submitBtn);
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
        await page.waitForSelector(matrixBtn);
        const matrixBtnXpath = await page.$(matrixBtn);
        if (matrixBtnXpath) {
            await page.evaluate((button) => {
                button.setAttribute('target', '_self');
            }, matrixBtnXpath);
            await matrixBtnXpath.click();
        }
        //////
        await new Promise(resolve => setTimeout(resolve, 13000));
        await page.goto('https://matrix.fmlsd.mlsmatrix.com/Matrix/Search/Residential', { waitUntil: "domcontentloaded", });

        await page.waitForSelector(unselectAllCheckBoxes);
        const unselectCheckBoxesXpath = await page.$(unselectAllCheckBoxes);
        if (unselectCheckBoxesXpath) {
            await new Promise(resolve => setTimeout(resolve, 4000));
            await page.evaluate(() => {
                window.scrollBy(0, 500);
            });
            await new Promise(resolve => setTimeout(resolve, 3000));
            await unselectCheckBoxesXpath.click();
        }

        await page.waitForSelector(checkBoxes);
        await page.waitForSelector(textBoxes);
        const checkBoxesXpath = await page.$$(checkBoxes);
        const textBoxesXpath = await page.$$(textBoxes);
        await page.waitForSelector(result);
        const resultXpath = await page.$(result);
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
        await page.waitForSelector(selectAllListings);
        await page.waitForSelector(exportButton);
        await page.waitForSelector(totalListings);
        const totalListingsXpath = await page.$(totalListings);

        if (totalListingsXpath) {
            let text1 = await page.evaluate(element => element.innerText, totalListingsXpath);
            totalNumofLists = Number(text1);
        }
        const selectAllListingsXpath = await page.$(selectAllListings);
        const exportButtonXpath = await page.$(exportButton);
        if (pageNumSelector) {
            await selectAllListingsXpath.click();
            await new Promise(resolve => setTimeout(resolve, 5000));
            await exportButtonXpath.click();
            await new Promise(resolve => setTimeout(resolve, 10000));
            await page.select('select[id="m_ddExport"]', 'ud39051');
        }
        await page.waitForSelector(exportCsv);
        const exportCsvXpath = await page.$(exportCsv);
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (exportCsvXpath) {
            await exportCsvXpath.click()
            console.log("Csv Downloaded")
        }
        await new Promise(resolve => setTimeout(resolve, 3000));
        await page.waitForSelector(goBack);
        const goBackXpath = await page.$(goBack);
        if (goBackXpath) {
            await goBackXpath.click();
        }
        await new Promise(resolve => setTimeout(resolve, 10000));

        const filePath = path.join(__dirname, 'downloads', 'Agent Autopilot.csv');
        await page.waitForSelector(MLSofListings);
        const MLSofListingsXpath = await page.$(MLSofListings);
        if (MLSofListingsXpath) {
            await MLSofListingsXpath.click();
        }
        for (let index = 0; index < totalNumofLists; index++) {
            SellerFlag = true;
            await new Promise(resolve => setTimeout(resolve, 4000));
            await page.waitForSelector(getCurrListNum);
            // await page.waitForSelector(clickSellerInfo);
            const getCurrListNumXpath = await page.$(getCurrListNum);
            // const clickSellerInfoXpath = await page.$(clickSellerInfo);
            if (getCurrListNumXpath) {
                let text = await page.evaluate(element => element.innerText, getCurrListNumXpath);
                currListNum = text;
            } else {
                console.log('Could not get List Number');
            }
            console.log("Current List : " + currListNum);
            await new Promise(resolve => setTimeout(resolve, 5000));
            const clickLinkIfNotEmpty = async (selector) => {
                const link = await page.$(selector);
                if (!link) {
                    SellerFlag = false;
                    throw new Error('Link not found');
                }

                const linkText = await page.evaluate(el => el.textContent.trim(), link);
                if (linkText === '') {
                    SellerFlag = false;
                    throw new Error('Link is empty');
                }
                if (SellerFlag) {
                    await link.click()
                }


            };

            // Example usage: Click a link inside the container with class "elements"
            try {
                await clickLinkIfNotEmpty(clickSellerInfo);
            } catch (error) {
                console.log("Error : " + error);
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
            let currSellerEmail = '';
            if (SellerFlag) {
                const pages = await browser.pages();

                // Switch to the last tab (the newly opened tab)
                const lastPage = pages[pages.length - 1];
                await new Promise(resolve => setTimeout(resolve, 5000));

                await lastPage.waitForSelector(getSellerEmail);
                const getSellerEmailXpath = await lastPage.$(getSellerEmail);
                await lastPage.waitForSelector(closeBtn);
                const closeBtnXpath = await lastPage.$(closeBtn);

                currSellerEmail = '';
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
            }


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
            await page.waitForSelector(nextPage);
            const nextPageXpath = await page.$(nextPage);
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

app.get('/', (req, res) => {
    console.log("GET api called")
    fetch();
});



app.listen(port, () => {
    console.log(`Scrapper listening on port ${port}`);
});


