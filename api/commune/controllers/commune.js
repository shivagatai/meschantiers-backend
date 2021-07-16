"use strict";

const { parseMultipartData } = require("strapi-utils");
const csv = require("csvtojson");
const fs = require("fs");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async loadcommunes(ctx) {
    if (ctx.is("multipart")) {
      // parse the multipart data, you will need to send file as files.files key
      // and some random json object in the data key
      const { files } = parseMultipartData(ctx);
      // convert the local tmp file to a buffer
      const buffer = fs.readFileSync(files.files.path);
      // stream that file buffer into the conversion function to get usable json
      let json = await csv().fromString(buffer.toString());
      // finally loop through the json and fire the Strapi update queries
      await json.map(async (com) => {
        try {
          //         console.log(com);
          const comcom = await strapi.services.epci.findOne({
            epci: parseInt(com.EPCI),
          });
          if (!comcom) {
            ctx.throw(
              400,
              "Impossible de trouver l’EPCI associé : " + com.EPCI
            );
          }

          const dpt = await strapi.services.departement.findOne({
            dpt: parseInt(com.DPT),
          });
          if (!dpt) {
            ctx.throw(
              400,
              "Impossible de trouver le département associé : " + com.DPT
            );
          }
          console.log("commune.create dpt : " + JSON.stringify(dpt));
          console.log("commune.create comcom : " + JSON.stringify(comcom));

          console.log(
            "commune.create : " +
              JSON.stringify({
                insee_nv: parseInt(com.INSEE_NV),
                commune_nv: com.COMMUNE_NV,
                epci: {
                  id: comcom.id,
                },
                departement: {
                  id: dpt.id,
                },
              })
          );

          await strapi.services.commune.create({
            insee_nv: parseInt(com.INSEE_NV),
            commune_nv: com.COMMUNE_NV,
            epci: {
              id: comcom.id,
            },
            departement: {
              id: dpt.id,
            },
          });
        } catch (err) {
          console.log("Exception : ", err);
        }
      });
      return { updated: true };
    } else {
      return ctx.badRequest("request format incorrect");
    }
  },
};
