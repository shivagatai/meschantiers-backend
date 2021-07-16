"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */
module.exports = {
  find(params, populate) {
    return strapi
      .query("epci")
      .find(params, [
        "communes",
        "communes.epci",
        "communes.departement",
        "communes.sites",
      ]);
  },
  findOne(params, populate) {
    return strapi
      .query("epci")
      .find(params, [
        "communes",
        "communes.epci",
        "communes.departement",
        "communes.sites",
      ]);
  },
};
