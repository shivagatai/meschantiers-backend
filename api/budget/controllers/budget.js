"use strict";

const { parseMultipartData, sanitizeEntity } = require("strapi-utils");
const csv = require("csvtojson");
const fs = require("fs");
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async loadbudgets(ctx) {
    const sansVirgule = (str) => {
      return str.replace(",", ".");
    };

    if (ctx.is("multipart")) {
      // parse the multipart data, you will need to send file as files.files key
      // and some random json object in the data key
      const { files } = parseMultipartData(ctx);
      // convert the local tmp file to a buffer
      const buffer = fs.readFileSync(files.files.path);
      // stream that file buffer into the conversion function to get usable json
      let json = await csv({ delimiter: ";" }).fromString(buffer.toString());

      const { annee, mois, jour } = ctx.params;
      const dateBudget = new Date(annee, mois - 1, jour);

      // finally loop through the json and fire the Strapi update queries
      await json.map(async (row) => {
        console.log(row);
        try {
          if (row.CODE__CHANTIER) {
            //console.log("Budget pour chantier : " + row.CODE__CHANTIER);
            // un budget est associé à un chantier, on le recherche
            const chantier = await strapi.services.chantier.findOne({
              numero: row.CODE__CHANTIER,
            });
            if (chantier) {
              console.log("Chantier " + row.CODE__CHANTIER + " trouvé");
              // si on l’a trouvé, on crée le budget
              let op = {
                /** 
              programme: row.PROGRAMME,
              etablissement: row.ETABLISSEMENT,
              operation: row.OPERATION,
                */
                chantier: {
                  id: chantier.id,
                },
                date_suivi_budget: dateBudget,
                cout_previsionnel_operation: sansVirgule(
                  row.COUT_PREVISIONNEL_OPERATION__GDA_
                ),
                engagement_total: sansVirgule(row.ENGAGEMENT__TOTAL),
                reste_a_engager_sur_operation: sansVirgule(
                  row.RESTE_A_ENGAGER_SUR_L_OPERATION
                ),
                mandatement_exercice_en_cours: sansVirgule(
                  row.MANDATEMENT__EXERCICE_EN_COURS_2021
                ),
                mandatement_total: sansVirgule(row.MANDATEMENT_TOTAL),
                reste_a_mandater_sur_operation: sansVirgule(
                  row.RESTE_A_MANDATER_SUR_L_OPERATION
                ),
                reste_a_mandater_sur_engagement: sansVirgule(
                  row.RESTE_A_MANDATER_SUR_L_ENGAGEMENT
                ),
              };

              const entity = sanitizeEntity(op, {
                model: strapi.models.budget,
              });
              //      console.log(entity);

              try {
                const budget_cree = await strapi.services.budget.create(entity);
              } catch (err) {
                console.error(
                  "Impossible de créer budget " + JSON.stringify(entity),
                  err
                );
              }
            }
          }
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
