const fs = require("fs");
const request = require("request");
const path = require("path");
const URL = require("url");

// create dumps folder if not exists
if (!fs.existsSync("dumps")) fs.mkdirSync("dumps");

const loc = path.resolve("dumps/images");

// create images folder if does not exist
if (!fs.existsSync(loc)) {
  fs.mkdirSync(loc);
}

// setting user agent in case it blocks requests
const userAgent =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36";

// generic file download function
function download(url, filename = "") {
  return new Promise(function (resolve, reject) {
    if (!url) return resolve();
    request.head(url, function (error, response, body) {
      if (error) return reject(error);

      const parsed = URL.parse(url);
      const fpath = path.join(loc, filename || path.basename(parsed.pathname));

      request({
        url,
        headers: {
          "User-Agent": userAgent,
        },
      })
        .on("error", reject)
        .pipe(fs.createWriteStream(fpath))
        .on("close", resolve);
    });
  });
}

// promise function fulfilled when all images are saved.
function storeImages(products = []) {
  return new Promise(function (resolve, reject) {
    const count = products.length;

    let done = 0;

    products.map(function (product) {
      const image =
        product["images"].length !== 0 ? product["images"][0].url : "";

      download(image, product["id"] + ".jpg")
        .catch(reject)
        .finally(() => {
          done++;
          if (done === count) resolve(done);
        });
    });
  });
}

module.exports = storeImages;
