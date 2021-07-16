"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

module.exports = {
  find(params, populate) {
    return strapi
      .query("chantier")
      .find(params, [
        "etape",
        "site",
        "site.commune",
        "site.commune.departement",
      ]);
  },
  findOne(params, populate) {
    return strapi
      .query("chantier")
      .findOne(params, [
        "etape",
        "site",
        "site.commune",
        "site.commune.departement",
      ]);
  },
};
