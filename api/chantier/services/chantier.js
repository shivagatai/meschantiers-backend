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
        "revues",
        "budgets",
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
        "revues",
        "budgets",
      ]);
  },
  /**
   * Promise to delete a chantier and reviews attached (delete cascade)
   *
   * @return {Promise}
   */

  async delete(params) {
    console.log("#start chantier.service.delete");
    const entity = await strapi.query("chantier").delete(params);

    if (entity && entity.revues) {
      const promises = entity.revues.map(async (element) => {
        console.log("chantier.service.delete revue " + id);
        return await strapi.query("revue").delete({ id: element.id });
      });
      await Promise.all(promises);
    }
    console.log("#end chantier.service.delete");
    return entity;
  },
};
