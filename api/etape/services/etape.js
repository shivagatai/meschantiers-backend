"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

module.exports = {
  find(params, populate) {
    return strapi
      .query("etape")
      .find(params, [
        "chantiers",
        "chantiers.etape",
        "chantiers.site",
        "chantiers.revues",
      ]);
  },
  findOne(params, populate) {
    return strapi
      .query("etape")
      .findOne(params, [
        "chantiers",
        "chantiers.etape",
        "chantiers.site",
        "chantiers.revues",
      ]);
  },
};
