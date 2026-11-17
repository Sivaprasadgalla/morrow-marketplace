export type Product = {
  id: string;
  variantId?: string;
  slug: string;
  name: string;
  maker: string;
  category: "Homeware" | "Furniture" | "Lighting" | "Decor" | "Textiles";
  productType?: "physical" | "digital" | "service";
  fulfilment?: { requiresShipping?: boolean; deliveryLabel?: string; serviceDurationMinutes?: number };
  price: number;
  compareAt?: number;
  rating: number;
  reviews: number;
  stock: number;
  image: string;
  secondaryImage: string;
  images?: string[];
  description: string;
  materials: string;
  delivery: string;
  isNew?: boolean;
  bestseller?: boolean;
};

export const products: Product[] = [
  {
    id: "prd_001",
    slug: "kosi-dinner-set",
    name: "Kosi dinner set",
    maker: "Asha Clay Studio",
    category: "Homeware",
    price: 5900,
    rating: 4.9,
    reviews: 128,
    stock: 18,
    image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1200&q=88",
    secondaryImage: "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=1200&q=88",
    description: "A tactile twelve-piece stoneware set, thrown and glazed by hand in small batches. Each piece carries subtle variations from the firing process.",
    materials: "Speckled stoneware, food-safe glaze",
    delivery: "Dispatches in 3–5 business days",
    bestseller: true,
  },
  {
    id: "prd_002",
    slug: "nira-lounge-chair",
    name: "Nira lounge chair",
    maker: "Studio Grain",
    category: "Furniture",
    price: 24900,
    rating: 4.8,
    reviews: 62,
    stock: 7,
    image: "https://images.unsplash.com/photo-1598300056393-4aac492f4344?auto=format&fit=crop&w=1200&q=88",
    secondaryImage: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1200&q=88",
    description: "A low, generous lounge chair built from responsibly sourced teak and handwoven cane. Designed for long, unhurried afternoons.",
    materials: "Solid teak, natural cane",
    delivery: "Made to order · 3–4 weeks",
    isNew: true,
  },
  {
    id: "prd_003",
    slug: "ahan-pendant-light",
    name: "Ahan pendant light",
    maker: "Tula Works",
    category: "Lighting",
    price: 8900,
    rating: 4.9,
    reviews: 84,
    stock: 11,
    image: "https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=1200&q=88",
    secondaryImage: "https://images.unsplash.com/photo-1573148195900-7845dcb9b127?auto=format&fit=crop&w=1200&q=88",
    description: "A quietly sculptural pendant with a softly hammered surface that casts a warm, focused pool of light.",
    materials: "Hand-beaten brass, cotton flex",
    delivery: "Dispatches in 5–7 business days",
    bestseller: true,
  },
  {
    id: "prd_004",
    slug: "taru-cushion-cover",
    name: "Taru cushion cover",
    maker: "Prakriti Loom",
    category: "Textiles",
    price: 1490,
    rating: 4.7,
    reviews: 45,
    stock: 34,
    image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1200&q=88",
    secondaryImage: "https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=1200&q=88",
    description: "A textural handwoven cushion cover with a geometric motif inspired by terraced fields and forest paths.",
    materials: "Handspun cotton, natural dyes",
    delivery: "Dispatches in 2–3 business days",
  },
  {
    id: "prd_005",
    slug: "belka-wooden-bowl",
    name: "Belka wooden bowl",
    maker: "Bhoomi Objects",
    category: "Decor",
    price: 3200,
    rating: 4.8,
    reviews: 37,
    stock: 15,
    image: "https://images.unsplash.com/photo-1591958911259-bee2173bdccc?auto=format&fit=crop&w=1200&q=88",
    secondaryImage: "https://images.unsplash.com/photo-1531988042231-d39a9cc12a9a?auto=format&fit=crop&w=1200&q=88",
    description: "A hand-carved centrepiece that celebrates the grain, knots and quiet irregularities of reclaimed wood.",
    materials: "Reclaimed mango wood, natural oil",
    delivery: "Dispatches in 3–5 business days",
    isNew: true,
  },
  {
    id: "prd_006",
    slug: "mira-table-lamp",
    name: "Mira table lamp",
    maker: "Tula Works",
    category: "Lighting",
    price: 7400,
    rating: 4.6,
    reviews: 29,
    stock: 9,
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=88",
    secondaryImage: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1200&q=88",
    description: "A compact bedside lamp balancing a warm brass stem with a generous hand-finished linen shade.",
    materials: "Brass, powder-coated steel, linen",
    delivery: "Dispatches in 5–7 business days",
  },
  {
    id: "prd_007",
    slug: "neer-linen-throw",
    name: "Neer linen throw",
    maker: "Prakriti Loom",
    category: "Textiles",
    price: 3650,
    rating: 4.9,
    reviews: 53,
    stock: 22,
    image: "https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=1200&q=88",
    secondaryImage: "https://images.unsplash.com/photo-1583845112203-29329902332e?auto=format&fit=crop&w=1200&q=88",
    description: "An airy, weighty linen throw with hand-twisted tassels, washed for a relaxed texture from the first use.",
    materials: "European flax linen",
    delivery: "Dispatches in 2–3 business days",
    bestseller: true,
  },
  {
    id: "prd_008",
    slug: "aranya-side-table",
    name: "Aranya side table",
    maker: "Studio Grain",
    category: "Furniture",
    price: 12800,
    compareAt: 14500,
    rating: 4.8,
    reviews: 31,
    stock: 5,
    image: "https://images.unsplash.com/photo-1532372320572-cda25653a694?auto=format&fit=crop&w=1200&q=88",
    secondaryImage: "https://images.unsplash.com/photo-1532323544230-7191fd51bc1b?auto=format&fit=crop&w=1200&q=88",
    description: "A compact side table with a monolithic silhouette, softened by hand-rounded edges and a deep natural finish.",
    materials: "Solid ash wood, hardwax oil",
    delivery: "Made to order · 2–3 weeks",
  },
];

export const categories = ["All", "Homeware", "Furniture", "Lighting", "Decor", "Textiles"] as const;

export const makers = [
  { name: "Asha Clay Studio", location: "Khurja, Uttar Pradesh", products: 24 },
  { name: "Studio Grain", location: "Bengaluru, Karnataka", products: 18 },
  { name: "Tula Works", location: "Pune, Maharashtra", products: 31 },
  { name: "Prakriti Loom", location: "Bhuj, Gujarat", products: 27 },
];
