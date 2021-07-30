"use strict";

const { parseMultipartData, sanitizeEntity } = require("strapi-utils");
const csv = require("csvtojson");
const fs = require("fs");

const { DateTime } = require("luxon");

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
    function fillProjetPlanningComponent(valueDate) {
      // Composant projet.planning
      const labelDate = ["remise_prog", "notif_moe", "notif_ent", "fin_tvx"];

      const returnValue = {};

      valueDate.map((dte, idx) => {
        if (dte) {
          returnValue[labelDate[idx]] = dateFormat(dte);
        }
      });
      return returnValue;
    }

    async function searchIfChantierAlreadyExist(option) {
      const chantierFoundList = await strapi.services.chantier.find(option);
      if (chantierFoundList && 1 == chantierFoundList.length) {
        return chantierFoundList[0];
      } else {
        return false;
      }
    }

    // Prépare la comparaison de string case insensitive
    const checkIfOui = (val) => {
      let collator = new Intl.Collator("fr", { sensitivity: "base" });
      return 0 == collator.compare(val, "oui");
    };

    const dateFormat = (datum) => {
      if (datum) {
        const parts = datum.split("/");
        if (parts[2] && parts[1] && parts[0]) {
          return DateTime.fromObject({
            year:
              2 === parts[2].length
                ? 2000 + parseInt(parts[2])
                : parseInt(parts[2]),
            month: parseInt(parts[1]),
            day: parseInt(parts[0]),
          }).toISODate();
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

    // From https://stackoverflow.com/questions/286141/remove-blank-attributes-from-an-object-in-javascript
    // ES10
    const removeEmpty = (obj) => {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v != null)
          .map(([k, v]) => [k, v === Object(v) ? removeEmpty(v) : v])
      );
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

            const valueDatePrev = [
              chantier.REMISE_PROG_DATE_PREV,
              chantier.NOTIF_MOE_DATE_PREV,
              chantier.NOTIF_ENT_DATE_PREV,
              chantier.FIN_TVX_DATE_PREV,
            ];

            const valueDateReel = [
              chantier.REMISE_PROG_DATE_REEL,
              chantier.NOTIF_MOE_DATE_REEL,
              chantier.NOTIF_ENT_DATE_REEL,
              chantier.FIN_TVX_DATE_REEL,
            ];

            let op = {
              numero: chantier.N_CHANTIER,
              operation: chantier.OPERATIONS,
              prevu: fillProjetPlanningComponent(valueDatePrev),
              reel: fillProjetPlanningComponent(valueDateReel),
              comite_proj: checkIfOui(chantier.COMITE_PROJ),
              etat: sansAccent(chantier.ETAT),
              plan_relance: checkIfOui(chantier.PLAN_RELANCE),
              cpe: checkIfOui(chantier.CPE),
              dfap: checkIfOui(chantier.DFAP),
              categorie_travaux: chantier.CAT_TVX,
              fonction_associee: chantier.FCT_ASSOC,
            };

            //          op = fillProjetPlanningComponent(valueDatePrev, "date_prev");

            //        op = fillProjetPlanningComponent(valueDateReel, "date_reel");

            //         op = fillDateReel(chantier, op, dateFormat);

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
            let chantierFound = false;
            if (op.numero) {
              chantierFound = await searchIfChantierAlreadyExist({
                numero: op.numero,
              });
            }

            if (!chantierFound && op.operation) {
              // sinon on cherche par le libellé de l'opération
              chantierFound = await searchIfChantierAlreadyExist({
                operation: op.operation,
              });
            }

            const entity = removeEmpty(op);
            // Il faudrait faire ces deux créations (chantier+revue) en mode transaction
            let chantier_cree;
            try {
              if (chantierFound) {
                // on a un identifiant strapi pour le chantier, on fait une mise à jour :
                chantier_cree = await strapi.services.chantier.update(
                  { id: chantierFound.id },
                  entity
                );
              } else {
                // Ni le code, ni l'opération ne sont uniques, il s'agit très probablement d'un nouveau chantier
                console.log(
                  "Nouveau chantier found : " + JSON.stringify(chantier)
                );
                chantier_cree = await strapi.services.chantier.create(entity);
              }
            } catch (err) {
              console.error(
                "Impossible de créer chantier " + JSON.stringify(entity),
                err
              );
            }

            // si une revue de chantier a été ajoutée
            if (chantier_cree && chantier.DATE_MAJ) {
              const revue_actuelle = {
                info_cles: chantier.INFO_CLES,
                info_marches: chantier.OBS_SPJMP,
                date_maj: dateFormat(chantier.DATE_MAJ),
                chantier: {
                  id: chantier_cree.id,
                },
              };

              if (
                chantierFound &&
                chantier_cree.revues.some(
                  (item) =>
                    DateTime.fromISO(item.date_maj).toMillis() ===
                    DateTime.fromISO(revue_actuelle.date_maj).toMillis()
                )
              ) {
                // On est en mode mise à jour et on a trouvé une revue à la même date donc on ne fait rien
              } else {
                // soit on est en mode création d’un nouveau chantier
                // soit on met à jour le chantier mais il n’y a pas de revue attachée avec la même date
                const revue_strapi = await strapi.services.revue.create(
                  revue_actuelle
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
  async loadmarches(ctx) {
    const dateFormat = (datum) => {
      if (datum) {
        const parts = datum.split("/");
        if (parts[2] && parts[1] && parts[0]) {
          return DateTime.fromObject({
            year:
              2 === parts[2].length
                ? 2000 + parseInt(parts[2])
                : parseInt(parts[2]),
            month: parseInt(parts[1]),
            day: parseInt(parts[0]),
          });
        } else {
          console.error("Impossible de formater la date " + datum);
          return;
        }
      }
      return;
    };

    if (ctx.is("multipart")) {
      // parse the multipart data, you will need to send file as files.files key
      // and some random json object in the data key
      const { files } = parseMultipartData(ctx);
      // convert the local tmp file to a buffer
      const buffer = fs.readFileSync(files.files.path);
      // stream that file buffer into the conversion function to get usable json
      let json = await csv({ delimiter: ";" }).fromString(buffer.toString());

      // finally loop through the json and fire the Strapi update queries
      await json.map(async (marche) => {
        try {
          if (marche.N_CHANTIER) {
            const chantierList = await strapi.services.chantier.find({
              numero: marche.N_CHANTIER,
            });
            if (chantierList && 1 === chantierList.length) {
              const chantier = chantierList[0];

              console.log("Found chantier" + JSON.stringify(chantier.id));

              let evt_marches = [];
              const recept_doss = dateFormat(marche.RECEPT_DOSS_DATE);
              if (
                recept_doss &&
                DateTime.isDateTime(recept_doss) &&
                recept_doss.isValid
              ) {
                evt_marches.push({
                  jalon_date: recept_doss.toISODate(),
                  observations: marche.RECEPT_DOSS_OBS,
                  type: "receptdoss",
                });
              }

              const envoi_sdm = dateFormat(marche.ENVOI_SDM_DATE);
              if (
                envoi_sdm &&
                DateTime.isDateTime(envoi_sdm) &&
                envoi_sdm.isValid
              ) {
                evt_marches.push({
                  jalon_date: envoi_sdm.toISODate(),
                  observations: marche.ENVOI_SDM_OBS,
                  type: "envoisdm",
                });
              }

              const publicite = dateFormat(marche.PUBLICITE_DATE);
              if (
                publicite &&
                DateTime.isDateTime(publicite) &&
                publicite.isValid
              ) {
                evt_marches.push({
                  jalon_date: publicite.toISODate(),
                  observations: marche.PUBLICITE_OBS,
                  type: "publicite",
                });
              }

              const remise_offre = dateFormat(marche.REMIS_OFFR_DATE);
              if (
                remise_offre &&
                DateTime.isDateTime(remise_offre) &&
                remise_offre.isValid
              ) {
                evt_marches.push({
                  jalon_date: remise_offre.toISODate(),
                  observations: marche.REMIS_OFFR_OBS,
                  type: "remiseoffre",
                });
              }

              const envoi_plis_moe = dateFormat(marche.ENVOI_PLIS_MOE_DATE);
              if (
                envoi_plis_moe &&
                DateTime.isDateTime(envoi_plis_moe) &&
                envoi_plis_moe.isValid
              ) {
                evt_marches.push({
                  jalon_date: envoi_plis_moe.toISODate(),
                  observations: marche.ENVOI_PLIS_MOE_OBS,
                  type: "envoiplismoe",
                });
              }

              const analyse = dateFormat(marche.ANALYSE_DATE);
              if (analyse && DateTime.isDateTime(analyse) && analyse.isValid) {
                evt_marches.push({
                  jalon_date: analyse.toISODate(),
                  observations: marche.ANALYSE_OBS,
                  type: "analyse",
                });
              }

              const envoi_analyse_sdm = dateFormat(
                marche.ENVOI_ANALYSE_SDM_DATE
              );
              if (
                envoi_analyse_sdm &&
                DateTime.isDateTime(envoi_analyse_sdm) &&
                envoi_analyse_sdm.isValid
              ) {
                evt_marches.push({
                  jalon_date: envoi_analyse_sdm.toISODate(),
                  observations: marche.ENVOI_ANALYSE_SDM_OBS,
                  type: "envoianalysesdm",
                });
              }

              const cao = dateFormat(marche.CAO_DATE);
              if (cao && DateTime.isDateTime(cao) && cao.isValid) {
                evt_marches.push({
                  jalon_date: cao.toISODate(),
                  observations: marche.CAO_OBS,
                  type: "cao",
                });
              }

              const notification = dateFormat(marche.NOTIFICATION_DATE);
              if (
                notification &&
                DateTime.isDateTime(notification) &&
                notification.isValid
              ) {
                evt_marches.push({
                  jalon_date: notification.toISODate(),
                  observations: marche.NOTIFICATION_OBS,
                  type: "notification",
                });
              }

              console.log({ evt_marches });
              // on a un identifiant strapi pour le chantier, on fait une mise à jour :
              const chantier_updated = await strapi.services.chantier.update(
                { id: chantier.id },
                {
                  evt_marches,
                }
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
