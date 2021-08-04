"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

module.exports = {
  find(params, populate) {
    return strapi
      .query("commune")
      .find(params, ["departement", "epci", "sites", "sites.chantiers"]);
  },
  findOne(params, populate) {
    return strapi
      .query("commune")
      .findOne(params, ["departement", "epci", "sites", "sites.chantiers"]);
  },
};
