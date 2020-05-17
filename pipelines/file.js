const fs = require("fs");
const path = require("path");

// create dumps folder if not exists
if (!fs.existsSync("dumps")) fs.mkdirSync("dumps");

const loc = path.resolve("dumps/data.jl");

// remove data.jl file is exists
if (fs.existsSync(loc)) fs.unlinkSync(loc);

function storeFile(products = []) {
  return new Promise((resolve, reject) => {
    const count = products.length;

    let done = 0;

    products.map(function (product) {
      fs.promises
        .appendFile(loc, JSON.stringify(product) + "\r\n")
        .catch(reject)
        .finally(() => {
          done++;
          if (done === count) resolve(done);
        });
    });
  });
}

module.exports = storeFile;
