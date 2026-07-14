// BioEcho Marketplace — Products, Services, Recommendations, Donations

class Marketplace {
  constructor(twinEngine, speciesDB) {
    this.twinEngine = twinEngine;
    this.speciesDB = speciesDB;
    this.products = this._initProducts();
    this.orders = [];
    this.donations = [];
  }

  async browse(category, filters) {
    let results = this.products;
    if (category) results = results.filter(p => p.category === category);
    if (filters?.maxPrice) results = results.filter(p => p.price <= filters.maxPrice);
    if (filters?.minRating) results = results.filter(p => p.rating >= filters.minRating);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    return results;
  }

  async getRecommendations(organismId) {
    const twin = this.twinEngine.getTwin(organismId);
    if (!twin) return this.products.slice(0, 5);
    const species = this.speciesDB.getSpecies(twin.species);
    const recs = [];

    for (const product of this.products) {
      let score = 0;
      if (product.compatibleWith?.includes(twin.species)) score += 0.5;
      if (product.category === 'sensor' && twin.type === 'plant') score += 0.3;
      if (product.category === 'electrode' && twin.type === 'plant') score += 0.4;
      if (product.category === 'plant_kit' && twin.type === 'plant') score += 0.3;
      if (product.category === 'pet_supplies' && twin.type === 'animal') score += 0.4;
      if (product.tags?.includes(species?.careRequirements?.light)) score += 0.2;
      if (score > 0) recs.push({ ...product, relevance: score });
    }

    recs.sort((a, b) => b.relevance - a.relevance);
    return recs.slice(0, 8);
  }

  async purchase(productId, paymentInfo) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return { success: false, error: 'Product not found' };
    const order = {
      id: `ord-${Date.now().toString(36)}`,
      productId, productName: product.name, price: product.price,
      status: 'confirmed', createdAt: Date.now()
    };
    this.orders.push(order);
    return { success: true, order };
  }

  async donate(organizationId, amount) {
    const donation = {
      id: `don-${Date.now().toString(36)}`,
      organizationId, amount, status: 'completed', createdAt: Date.now()
    };
    this.donations.push(donation);
    return { success: true, donation };
  }

  getOrders() { return this.orders.slice(-20); }
  getDonations() { return this.donations.slice(-20); }

  getStats() {
    return {
      totalProducts: this.products.length,
      totalOrders: this.orders.length,
      totalDonations: this.donations.length,
      revenue: this.orders.reduce((a, o) => a + o.price, 0),
      donated: this.donations.reduce((a, d) => a + d.amount, 0)
    };
  }

  _initProducts() {
    return [
      { id: 'p1', name: 'BioEcho Sensor Kit', category: 'sensor', description: 'Complete plant electrical monitoring kit with silver electrodes and ESP32', price: 89.99, rating: 4.8, reviews: 234, compatibleWith: ['all'], tags: ['beginner', 'kit'] },
      { id: 'p2', name: 'Pro Electrode Set', category: 'electrode', description: 'Medical-grade silver chloride electrodes for precise measurements', price: 34.99, rating: 4.7, reviews: 156, compatibleWith: ['all'], tags: ['professional', 'precision'] },
      { id: 'p3', name: 'Soil Moisture Sensor', category: 'sensor', description: 'Capacitive soil moisture sensor for watering predictions', price: 19.99, rating: 4.5, reviews: 89, compatibleWith: ['all'], tags: ['soil', 'watering'] },
      { id: 'p4', name: 'Indoor Plant Starter Kit', category: 'plant_kit', description: 'Everything for indoor plant monitoring — sensor, electrodes, guide', price: 129.99, rating: 4.9, reviews: 312, compatibleWith: ['pothos', 'monstera-deliciosa', 'spider-plant'], tags: ['indoor', 'starter'] },
      { id: 'p5', name: 'Pet Activity Monitor', category: 'pet_supplies', description: 'Wearable sensor for pet activity and health tracking', price: 59.99, rating: 4.6, reviews: 178, compatibleWith: ['golden-retriever', 'domestic-cat'], tags: ['pet', 'activity'] },
      { id: 'p6', name: 'Advanced Calibration Kit', category: 'accessory', description: 'Precision calibration tools for professional measurements', price: 49.99, rating: 4.4, reviews: 67, compatibleWith: ['all'], tags: ['calibration', 'professional'] },
      { id: 'p7', name: 'BioEcho Course: Plant Signals', category: 'course', description: 'Learn to read and interpret plant electrical signals', price: 29.99, rating: 4.8, reviews: 423, compatibleWith: ['all'], tags: ['education', 'beginner'] },
      { id: 'p8', name: 'Waterproof Field Kit', category: 'sensor', description: 'Weatherproof sensor kit for outdoor and field research', price: 149.99, rating: 4.7, reviews: 89, compatibleWith: ['all'], tags: ['outdoor', 'field', 'waterproof'] }
    ];
  }
}
