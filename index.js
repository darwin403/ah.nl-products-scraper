const fetch = require("node-fetch");
const winston = require("winston");

const logger = require("./utils/logger");

const storeFile = require("./pipelines/file");
const storeImages = require("./pipelines/image");
const storeSQL = require("./pipelines/sql");

// pipelines that will be used after each set of products are scraped
const enabledPipelines = {
  file: true, // enable to store products to dumps/data.jl
  images: false, // enable to store product images to dumps/images
  SQL: false, // enable to store products to Microsoft SQL Server
};

const categories = [
  "aardappel-groente-fruit",
  "verse-kant-en-klaar-maaltijden-salades",
  "vlees-kip-vis-vega",
  "kaas-vleeswaren-delicatessen",
  "zuivel-eieren",
  "bakkerij",
  "ontbijtgranen-broodbeleg-tussendoor",
  "frisdrank-sappen-koffie-thee",
  "wijn",
  "bier-sterke-drank-aperitieven",
  "pasta-rijst-internationale-keuken",
  "soepen-conserven-sauzen-smaakmakers",
  "snoep-koek-chips",
  "diepvries",
  "drogisterij-baby",
  "bewuste-voeding",
  "huishouden-huisdier",
  "koken-tafelen-non-food",
];

(async () => {
  let connection;

  if (enabledPipelines.SQL) {
    connection = await new storeSQL({
      user: "sa", // mssql username
      password: "yourStrong(!)Password", // mssql password
      server: "localhost", // mssql server
      options: {
        enableArithAbort: true, // hide warnings
      },
    }).init();
  }

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    logger.info(`Scraping category: "${category}"`);

    let currentPage = 0;
    let totalPages = 100; // modified as per response

    let currentBadRequests = 0;
    const maxBadRequests = 3;

    while (currentPage < totalPages && currentBadRequests < maxBadRequests) {
      let products = []; // products populated by request

      try {
        // const api = "https://www.ah.nl/zoe123213ken/api/products/search?";
        const api = "https://www.ah.nl/zoeken/api/products/search?";
        const params = new URLSearchParams({
          taxonomySlug: category,
          size: 10, // ah.nl imposes max size: 1000
          page: currentPage,
        });
        const url = api + params;

        // perform request
        const response = await fetch(url);
        if (response.status === 200) {
          json = await response.json();

          totalPages = json["page"].totalPages;
          products = json["cards"].map((i) => i["products"][0]);

          logger.info(`Pages scraped: ${currentPage + 1}/${totalPages}`);
          logger.info(`Products found: ${products.length}`);

          // reset bad request count
          currentBadRequests = 0;
        } else {
          logger.error(`Response ${response.status} unexpected`);
          logger.verbose(await response.text());
          currentBadRequests += 1;
        }
      } catch (error) {
        logger.error(`Request failed. ${error.message}`);
        logger.verbose(error.stack);
        currentBadRequests += 1;
      }

      // update count
      currentPage += 1;

      if (products.length === 0) continue;

      // run products through file pipeline
      if (enabledPipelines.file) {
        storeFile(products)
          .then((count) => {
            logger.info(`[file pipeline] Stored: ${count}`);
          })
          .catch((error) => {
            logger.error(`[file pipeline] ${error.message}`);
            logger.verbose(error.stack);
          });
      }

      // run products through image pipeline
      if (enabledPipelines.images) {
        storeImages(products)
          .then((count) => {
            logger.info(`[image pipeline] Stored: ${count}`);
          })
          .catch((error) => {
            logger.error(`[image pipeline] ${error.message}`);
            logger.verbose(error.stack);
          });
      }

      // run products through sql pipeline
      if (enabledPipelines.SQL) {
        if (connection) {
          connection
            .insertProducts(products)
            .then((count) => {
              logger.info(`[sql pipeline] Stored: ${count}`);
            })
            .catch((error) => {
              logger.error(`[sql pipeline] ${error.message}`);
              logger.verbose(error.stack);
            });
        }
      }
    }
  }
  return;
})();
