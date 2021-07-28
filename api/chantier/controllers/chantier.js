"use strict";


const { parseMultipartData, sanitizeEntity } = require("strapi-utils");
const csv = require("csvtojson");
const fs = require("fs");


import { DateTime } from "luxon"


/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {

  
  /** Purge tous les chantiers et les revues associées */
  async purgechantiers(ctx) {
    console.log("#start chantier.controller.purgechantiers");
    const chantiers = await strapi.services.chantier.find();

    const promises = chantiers.map(async (chantier) => {
      const { id } = chantier;
      console.log("#start purgechantier " + id);
      return await strapi.services.chantier.delete({ id });
    });
    await Promise.all(promises);
    console.log("#end chantier.controller.purgechantiers");
  },

  async loadchantiers(ctx) {
  
// Prépare la comparaison de string case insensitive
const checkIfOui = (val) => {
  let collator = new Intl.Collator('fr', { sensitivity: 'base' });
  return 0 == collator.compare(val, "oui");
}

const dateFormat = (datum) => {
      if (datum) {
        const parts = datum.split("/");
        if (parts[2] && parts[1] && parts[0]) {
          return DateTime.fromObject({
            year: 2 === parts[2].length
              ? 2000 + parseInt(parts[2])
              : parseInt(parts[2]),
            month : parseInt(parts[1]) - 1,
            day : parseInt(parts[0]),
          }
            
            
            
          );
        } else {
          console.error("Impossible de formater la date " + datum);
          return;
        }
      }
      return;
    };

    const sansAccent = (str) => {
      var accent = [
        /[\300-\306]/g,
        /[\340-\346]/g, // A, a
        /[\310-\313]/g,
        /[\350-\353]/g, // E, e
        /[\314-\317]/g,
        /[\354-\357]/g, // I, i
        /[\322-\330]/g,
        /[\362-\370]/g, // O, o
        /[\331-\334]/g,
        /[\371-\374]/g, // U, u
        /[\321]/g,
        /[\361]/g, // N, n
        /[\307]/g,
        /[\347]/g, // C, c
      ];
      var noaccent = [
        "A",
        "a",
        "E",
        "e",
        "I",
        "i",
        "O",
        "o",
        "U",
        "u",
        "N",
        "n",
        "C",
        "c",
      ];

      for (var i = 0; i < accent.length; i++) {
        str = str.replace(accent[i], noaccent[i]);
      }

      return str;
    };

    if (ctx.is("multipart")) {
      // parse the multipart data, you will need to send file as files.files key
      // and some random json object in the data key
      const { files } = parseMultipartData(ctx);
      // convert the local tmp file to a buffer
      const buffer = fs.readFileSync(files.files.path);
      // stream that file buffer into the conversion function to get usable json
      let json = await csv().fromString(buffer.toString());


      // finally loop through the json and fire the Strapi update queries
      await json.map(async (chantier) => {
        try {
          if (chantier.OPERATIONS) {
            //        console.log(site)
            let op = {
              numero: chantier.N_CHANTIER,
              operation: chantier.OPERATIONS,
              remise_prog_date_prev: dateFormat(chantier.REMISE_PROG_DATE_PREV),
              notif_moe_date_prev: dateFormat(chantier.NOTIF_MOE_DATE_PREV),
              notif_ent_date_prev: dateFormat(chantier.NOTIF_ENT_DATE_PREV),
              fin_tvx_date_prev: dateFormat(chantier.FIN_TVX_DATE_PREV),
              remise_prog_date_reel: dateFormat(chantier.REMISE_PROG_DATE_REEL),
              notif_moe_date_reel: dateFormat(chantier.NOTIF_MOE_DATE_REEL),
              notif_ent_date_reel: dateFormat(chantier.NOTIF_ENT_DATE_REEL),
              fin_tvx_date_reel: dateFormat(chantier.FIN_TVX_DATE_REEL),
              comite_proj: checkIfOui(chantier.COMITE_PROJ),
              etat: sansAccent(chantier.ETAT),
              plan_relance: checkIfOui(chantier.PLAN_RELANCE),
              cpe: checkIfOui(chantier.CPE),
              dfap: checkIfOui(chantier.DFAP),
              categorie_travaux: chantier.CAT_TVX,
              fonction_associee: chantier.FCT_ASSOC,
              date_delib: parseInt(chantier.DATE_DELIB),
            };

            if (chantier.AP_EST) {
              op = {
                ...op,
                ap_est: parseFloat(chantier.AP_EST.replace(/\s/g, "")),
              };
            }

            if (chantier.DATE_DELIB) {
              op = {
                ...op,
                date_deliberation: chantier.DATE_DELIB,
              };
            }

            if (chantier.PRIORITE) {
              op = {
                ...op,
                priorite: chantier.PRIORITE,
              };
            }

            const site = await strapi.services.site.findOne({
              nom_corrige_dbr: chantier.SITE,
            });
            if (!site) {
              console.log(
                "Impossible de trouver le site associé : " +
                  JSON.stringify(chantier.SITE)
              );
            } else {
              op = {
                ...op,
                site: {
                  id: site.id,
                },
              };
            }

            if (chantier.ETAPE) {
              const etape = await strapi.services.etape.findOne({
                ordre: parseInt(chantier.ETAPE.substring(0, 2)),
              });
              if (!etape) {
                console.log(
                  "Impossible de trouver l’étape associée : " + chantier.ETAPE
                );
              } else {
                op = {
                  ...op,
                  etape: {
                    id: etape.id,
                  },
                };
              }
            }

            /** souvent le numero est l'identifiant unique sauf
                 - s'il n'est pas précisé (cellule vide dans Excel)
                 - s'il s'agit d'une opération transverse
                findOne nous renverrait un élément unique sans qu'on sache s'il y a potentiellement d'autres éléments avec lesquels il pourrait être confondu
                
            */ 
            const chantierFoundList = await strapi.services.chantier.find({
              numero: chantier.numero,
            });
            if(chantierFoundList && 1 == chantierFoundList.length) {
              // on en a trouvé un et un seul
              const chantierFound = chantierFoundList[0]
              op = {
                ...op,
                id: chantierFound,
              };
            }
            else {
              // sinon on cherche par le libellé de l'opération
              const chantierFoundList = await strapi.services.chantier.find({
                operation: chantier.operation,
              });
              if(chantierFoundList && 1 == chantierFoundList.length) {
                const chantierFound = chantierFoundList[0]
                op = {
                  ...op,
                  id: chantierFound,
                };
              }
              else {
                // Ni le code, ni l'opération ne sont uniques, il s'agit très probablement d'un nouveau chantier
                console.log("Nouveau chantier found : "+JSON.stringify(chantier))
              }
  
            }

            // Il faudrait faire ces deux créations en mode transaction
            try {
              const chantier_cree
              if(op.id) {
                // on a un identifiant strapi pour le chantier, on fait une mise à jour :
                chantier_cree = await strapi.services.chantier.update(
                  op
                );  
              }
              else {
                chantier_cree = await strapi.services.chantier.create(
                  op
                );  
              }

              // si une revue de chantier a été ajoutée
              if (chantier.DATE_MAJ) {
                const revue_actuelle = {
                  info_cles: chantier.INFO_CLES,
                  info_marches: chantier.OBS_SPJMP,
                  date_maj: dateFormat(chantier.DATE_MAJ),
                  chantier: {
                    id: chantier_cree.id,
                  },
                };

                if(op.id && chantier_cree.revues.some(item => item.date_maj.toMillis() === revue_actuelle.date_maj.toMillis())) {
                  // On est en mode mise-à-jour et on a trouvé une revue à la même date donc on ne fait rien
                }
                else {
                  // soit on est en mode création d'un nouveau chantier, 
                  // soit on met à jour le chantier mais il n'y a pas de revue attachée avec la même date
                  const revue_strapi = await strapi.services.revue.create(
                    revue_actuelle
                  );  
                }
              }
            } catch (err) {
              console.error(
                "Impossible de créer chantier " + JSON.stringify(entity),
                err
              );
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


