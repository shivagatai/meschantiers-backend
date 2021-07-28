"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async loaddepartements(ctx) {
    const departements = [
      { nom: "Calvados", dpt: 14 },
      { nom: "Eure", dpt: 27 },
      { nom: "Manche", dpt: 50 },
      { nom: "Orne", dpt: 61 },
      { nom: "Seine-Maritime", dpt: 76 },
    ];
    // finally loop through the json and fire the Strapi update queries
    await departements.map(async (dpt) => {
      try {
        await strapi.services.departement.create(dpt);
      } catch (err) {
        console.log("Exception : ", err);
      }
    });
    return { updated: true };
  },
};
