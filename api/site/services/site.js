"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

module.exports = {
  find(params, populate) {
    return strapi
      .query("site")
      .find(params, [
        "commune",
        "commune.departement",
        "chantiers",
        "chantiers.etape",
      ]);
  },
  findOne(params, populate) {
    return strapi
      .query("site")
      .findOne(params, [
        "commune",
        "commune.departement",
        "chantiers",
        "chantiers.etape",
      ]);
  },
};
