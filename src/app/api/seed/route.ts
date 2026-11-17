import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { handleApiError } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { products } from "@/lib/products";
import { AuditLog } from "@/models/AuditLog";
import { AuthToken } from "@/models/AuthToken";
import { Cart } from "@/models/Cart";
import { InventoryMovement } from "@/models/InventoryMovement";
import { Order } from "@/models/Order";
import { PaymentEvent } from "@/models/PaymentEvent";
import { ProductModel } from "@/models/Product";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const configuredSecret = process.env.SEED_SECRET;
    const suppliedSecret = request.headers.get("x-seed-secret");
    if ((process.env.NODE_ENV === "production" || configuredSecret) && suppliedSecret !== configuredSecret) {
      return NextResponse.json({ error: "Invalid seed secret." }, { status: 401 });
    }

    await connectDB();
    const reset = request.headers.get("x-seed-reset") === "true";
    if (reset) {
      const database = (await connectDB()).connection.db;
      if (!database) throw new Error("Database connection is unavailable.");
      await Promise.all([
        AuditLog.deleteMany({}),
        AuthToken.deleteMany({}),
        Cart.deleteMany({}),
        InventoryMovement.deleteMany({}),
        Order.deleteMany({}),
        PaymentEvent.deleteMany({}),
        ProductModel.deleteMany({}),
        User.deleteMany({}),
        database.collection("accounts").deleteMany({}),
        database.collection("sessions").deleteMany({}),
        database.collection("verification_tokens").deleteMany({}),
      ]);
    }
    const passwordHash = await hash("demo123", 12);

    const [customer, vendor, admin] = await Promise.all([
      User.findOneAndUpdate(
        { email: "customer@morrow.demo" },
        { $set: { name: "Rhea Kapoor", passwordHash, role: "customer", status: "active", emailVerified: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
      User.findOneAndUpdate(
        { email: "vendor@morrow.demo" },
        {
          $set: {
            name: "Asha Mehta",
            passwordHash,
            role: "vendor",
            status: "active",
            emailVerified: new Date(),
            vendorProfile: {
              storeName: "Asha Clay Studio",
              storeSlug: "asha-clay-studio",
              description: "Small-batch stoneware made in Khurja.",
              verified: true,
              commissionRateBps: 1200,
              onboardingStatus: "approved",
            },
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
      User.findOneAndUpdate(
        { email: "admin@morrow.demo" },
        { $set: { name: "Kabir Shah", passwordHash, role: "admin", status: "active", emailVerified: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    ]);

    await ProductModel.bulkWrite(
      products.map((product, index) => ({
        updateOne: {
          filter: { slug: product.slug },
          update: {
            $set: {
              vendor: vendor._id,
              name: product.name,
              maker: product.maker,
              description: product.description,
              category: product.category,
              materials: product.materials,
              delivery: product.delivery,
              images: [product.image, product.secondaryImage],
              variants: [
                {
                  name: "Standard",
                  sku: `MRW-${String(index + 1).padStart(3, "0")}`,
                  options: {},
                  pricePaise: product.price * 100,
                  compareAtPaise: product.compareAt ? product.compareAt * 100 : undefined,
                  stock: product.stock,
                  reserved: 0,
                },
              ],
              status: "active",
              featured: Boolean(product.bestseller || product.isNew),
              tags: [product.category.toLowerCase(), product.isNew ? "new" : "classic"],
              ratingAverage: product.rating,
              ratingCount: product.reviews,
            },
          },
          upsert: true,
        },
      })),
    );

    const seededProducts = await ProductModel.find({ vendor: vendor._id }).limit(3).lean();
    if ((await Order.countDocuments({ customer: customer._id })) === 0 && seededProducts.length >= 3) {
      const now = Date.now();
      await Order.insertMany(
        seededProducts.map((product, index) => {
          const variant = product.variants[0];
          const subtotalPaise = variant.pricePaise * (index + 1);
          const taxPaise = Math.round(subtotalPaise * 0.18);
          const commissionPaise = Math.round(subtotalPaise * 0.12);
          return {
            orderNumber: `MR-DEMO-${String(index + 1).padStart(3, "0")}`,
            customer: customer._id,
            items: [
              {
                product: product._id,
                vendor: vendor._id,
                variantId: variant._id,
                productName: product.name,
                variantName: variant.name,
                sku: variant.sku,
                image: product.images[0],
                quantity: index + 1,
                unitPricePaise: variant.pricePaise,
                taxPaise,
                lineTotalPaise: subtotalPaise + taxPaise,
                commissionPaise,
                vendorPayablePaise: subtotalPaise - commissionPaise,
                fulfilmentStatus: index === 0 ? "delivered" : index === 1 ? "shipped" : "packed",
              },
            ],
            shippingAddress: {
              name: customer.name,
              phone: "9876543210",
              line1: "42 Residency Road",
              city: "Bengaluru",
              state: "Karnataka",
              postalCode: "560025",
              country: "India",
            },
            subtotalPaise,
            taxPaise,
            shippingPaise: 0,
            totalPaise: subtotalPaise + taxPaise,
            status: index === 0 ? "delivered" : index === 1 ? "shipped" : "processing",
            payment: {
              provider: "razorpay",
              providerOrderId: `demo_seed_order_${index + 1}`,
              providerPaymentId: `pay_demo_seed_${index + 1}`,
              status: "captured",
              paidAt: new Date(now - index * 86400000 * 7),
            },
            createdAt: new Date(now - index * 86400000 * 7),
          };
        }),
      );
    }

    await AuditLog.create({
      actor: admin._id,
      action: "database.seeded",
      entityType: "System",
      entityId: "seed",
      metadata: { products: products.length },
    });

    revalidatePath("/");
    revalidatePath("/shop");
    return NextResponse.json({
      success: true,
      accounts: ["customer@morrow.demo", "vendor@morrow.demo", "admin@morrow.demo"],
      password: "demo123",
      products: products.length,
      reset,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
