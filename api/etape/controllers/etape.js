"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async loadetapes(ctx) {
    const etapes = [
      { etape: "À lancer", ordre: 1 },
      { etape: "Faisabilité", ordre: 2 },
      { etape: "Consultation MOE", ordre: 3 },
      { etape: "Analyse des offres de MOE", ordre: 4 },
      { etape: "Études de MOE", ordre: 5 },
      { etape: "Autorisations administratives", ordre: 6 },
      { etape: "Consultation travaux", ordre: 7 },
      { etape: "Analyse des offres de travaux", ordre: 8 },
      { etape: "Notification marchés travaux", ordre: 9 },
      { etape: "Travaux", ordre: 10 },
      { etape: "Livré", ordre: 11 },
      { etape: "Autre", ordre: 12 },
      { etape: "Bloqué", ordre: 13 },
      { etape: "Décalé", ordre: 14 },
    ];
    // finally loop through the json and fire the Strapi update queries
    await etapes.map(async (step) => {
      try {
        await strapi.services.etape.create(step);
      } catch (err) {
        console.log("Exception : ", err);
      }
    });
    return { updated: true };
  },
};
