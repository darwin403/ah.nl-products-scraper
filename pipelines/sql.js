const sql = require("mssql");

class storeSQL {
  constructor(config) {
    this.DB_NAME = "ah_nl"; // database name
    this.TABLE_NAME = "products"; // table name
    this.config = config; // mssql config: https://github.com/tediousjs/node-mssql#configuration-1
  }
  init() {
    return sql.connect(this.config).then(async (pool) => {
      return new Promise(async (resolve, reject) => {
        try {
          await this.createDatabase(pool);
          await this.createTable(pool);

          pool.close();

          resolve(this);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  createDatabase(pool) {
    const query = `
    IF NOT EXISTS (SELECT name FROM master.dbo.sysdatabases WHERE name = N'${this.DB_NAME}')
        CREATE DATABASE [${this.DB_NAME}];
    `;
    return pool.query(query);
  }

  createTable(pool) {
    const query = `
        USE ${this.DB_NAME}
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='${this.TABLE_NAME}' and xtype='U')
        CREATE TABLE ${this.TABLE_NAME}
            ( 
            _id int IDENTITY(1,1) PRIMARY KEY,
            id int,
            control nvarchar(max),
            title nvarchar(255),
            link nvarchar(255),
            orderable bit,
            propertyIcons nvarchar(max),
            images nvarchar(max),
            price nvarchar(max),
            itemCatalogId int,
            brand nvarchar(255),
            category nvarchar(255),
            theme nvarchar(255),
            hqId int,
            gtins nvarchar(max),
            summary nvarchar(255),
            descriptionFull nvarchar(255),
            taxonomyId int,
            taxonomies nvarchar(max),
            properties nvarchar(max)
            );
    `;
    return pool.query(query);
  }

  insertProduct(pool, product) {
    return pool
      .request()
      .input("id", sql.Int, product.id)
      .input("control", sql.NVarChar(255), JSON.stringify(product.control))
      .input("title", sql.NVarChar(255), product.title)
      .input("link", sql.VarChar(255), product.link)
      .input("orderable", sql.Bit, product.orderable)
      .input(
        "propertyIcons",
        sql.NVarChar(sql.MAX),
        JSON.stringify(product.propertyIcons)
      )
      .input("images", sql.NVarChar(sql.MAX), JSON.stringify(product.images))
      .input("price", sql.NVarChar(sql.MAX), JSON.stringify(product.price))
      .input("itemCatalogId", sql.Int, product.itemCatalogId)
      .input("brand", sql.NVarChar(255), product.brand)
      .input("category", sql.NVarChar(255), product.category)
      .input("theme", sql.NVarChar(255), product.theme)
      .input("hqId", sql.Int, product.hqId)
      .input("gtins", sql.NVarChar(sql.MAX), JSON.stringify(product.gtins))
      .input("summary", sql.NVarChar(255), product.summary)
      .input("descriptionFull", sql.NVarChar(255), product.descriptionFull)
      .input("taxonomyId", sql.Int, product.taxonomyId)
      .input(
        "taxonomies",
        sql.NVarChar(sql.MAX),
        JSON.stringify(product.taxonomies)
      )
      .input(
        "properties",
        sql.NVarChar(sql.MAX),
        JSON.stringify(product.properties)
      )
      .query(
        `
          SET NOCOUNT ON
          USE ${this.DB_NAME}
          UPDATE products
          SET
            id = @id,
            control = @control,
            title = @title,
            link = @link,
            orderable = @orderable,
            propertyIcons = @propertyIcons,
            images = @images,
            price = @price,
            itemCatalogId = @itemCatalogId,
            brand = @brand,
            category = @category,
            theme = @theme,
            hqId = @hqId,
            gtins = @gtins,
            summary = @summary,
            descriptionFull = @descriptionFull,
            taxonomyId = @taxonomyId,
            taxonomies = @taxonomies,
            properties = @properties
          WHERE id=@id
          IF @@ROWCOUNT = 0
            INSERT INTO ${this.TABLE_NAME}
            ("id","control","title","link", "orderable", "propertyIcons","images","price","itemCatalogId","brand","category","theme","hqId","gtins","summary","descriptionFull","taxonomyId","taxonomies","properties")
            VALUES
            (@id, @control,@title,@link, @orderable, @propertyIcons, @images, @price, @itemCatalogId, @brand, @category,@theme, @hqId,@gtins, @summary, @descriptionFull, @taxonomyId,@taxonomies,@properties);
        `
      );
  }

  insertProducts(products = []) {
    return new sql.ConnectionPool(this.config).connect().then((pool) => {
      return new Promise(async (resolve, reject) => {
        const total = products.length;

        if (total === 0) return resolve(total);

        // insert products
        for (let i = 0; i < total; i++) {
          try {
            await this.insertProduct(pool, products[i]);
          } catch (error) {
            reject(error);
          }
        }

        pool.close();
        resolve(total);
      });
    });
  }
}

module.exports = storeSQL;
