'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const csv = require('csvtojson');
const fs = require('fs');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {

    async loadsites(ctx) {
        if (ctx.is('multipart')) {
            // parse the multipart data, you will need to send file as files.files key
            // and some random json object in the data key 
            const { files } = parseMultipartData(ctx);
            // convert the local tmp file to a buffer 
            const buffer = fs.readFileSync(files.files.path);
            // stream that file buffer into the conversion function to get usable json 
            let json = await csv().fromString(buffer.toString())
            // finally loop through the json and fire the Strapi update queries 
            await json.map(async site => {
                try {
            //        console.log(site)
                    if (site.INSEE_NV) {

                        const commune = await strapi.services.commune.findOne({
                            insee_nv: site.INSEE_NV
                        })
                        if (!commune) {
                            ctx.throw(400, "Impossible de trouver la commune associée : " + site.INSEE_NV)
                        }

                        if("HORS EPLE" == site.TYPE) {
                            site = {...site, TYPE: "HORS_EPLE"}
                            const entity = sanitizeEntity({
                                nom_corrige_dbr: site.NOM_CORRIGE_DBR
                                , eple: site.TYPE
                                , commune: {
                                    id: commune.id
                                }
                            }, { model: strapi.models.site });
                            console.log(entity)
                            await strapi.services.site.create(entity)
                        }
                        else {
                            const entity = sanitizeEntity({
                                nom_corrige_dbr: site.NOM_CORRIGE_DBR
                                , numero: site.NUMERO
                                , etiquet: site.ETIQUET
                                , etiquet_s: site.ETIQUET_S
                                , code_uai_rattachement: site.CODE_UAI_RATTACHEMENT
                                , eple: site.TYPE
                                , commune: {
                                    id: commune.id
                                }
                            }, { model: strapi.models.site });
                            await strapi.services.site.create(entity)    
                        }
                        
                    }
                    else {
                        console.log("Impossible de charger " + site.NOM_CORRIGE_DBR + " : Pas de commune associée")
                    }
                }
                catch (err) {
                    console.log("Exception : ", err)
                }
            }
            )
            return { updated: true }
        } else {
            return ctx.badRequest('request format incorrect');
        }
    },
};
