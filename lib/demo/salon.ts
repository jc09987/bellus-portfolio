export type Category = "facial" | "massage" | "nails" | "brows";

export type Service = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  durationMinutes: number;
  price: number;
};

export type Staff = {
  id: string;
  name: string;
  role: string;
  categories: Category[];
};

/** Seed catalog from the studio schema. No live salon is attached. */
export const SERVICES: Service[] = [
  { id: "svc-facial-hidratante", slug: "facial-hidratante", name: "Facial hidratante", category: "facial", durationMinutes: 60, price: 45 },
  { id: "svc-facial-antiedad", slug: "facial-antiedad", name: "Facial antiedad", category: "facial", durationMinutes: 75, price: 65 },
  { id: "svc-limpieza-facial", slug: "limpieza-facial", name: "Limpieza facial", category: "facial", durationMinutes: 50, price: 38 },
  { id: "svc-masaje-relajante", slug: "masaje-relajante", name: "Masaje relajante", category: "massage", durationMinutes: 60, price: 55 },
  { id: "svc-manicura-clasica", slug: "manicura-clasica", name: "Manicura clásica", category: "nails", durationMinutes: 45, price: 25 },
  { id: "svc-diseno-cejas", slug: "diseno-cejas", name: "Diseño de cejas", category: "brows", durationMinutes: 30, price: 18 },
];

export const STAFF: Staff[] = [
  { id: "stf-laura", name: "Laura Martínez", role: "Esteticista facial", categories: ["facial"] },
  { id: "stf-carmen", name: "Carmen López", role: "Esteticista facial", categories: ["facial"] },
  { id: "stf-sofia", name: "Sofia Ruiz", role: "Masajista", categories: ["massage"] },
  { id: "stf-elena", name: "Elena Torres", role: "Manicura y uñas", categories: ["nails"] },
  { id: "stf-ana", name: "Ana García", role: "Técnico cejas y pestañas", categories: ["brows"] },
];

export const WALK_IN = {
  clientName: "Walk-in guest",
  clientEmail: "guest@example.com",
  clientPhone: "0000000000",
};

export const STUDIO = {
  name: "Bellus Lab Centro",
  hours: "09:00–19:00",
};

export function serviceById(id: string): Service | undefined {
  return SERVICES.find((service) => service.id === id);
}

export function staffById(id: string): Staff | undefined {
  return STAFF.find((person) => person.id === id);
}

export function staffFor(service: Service): Staff {
  const match = STAFF.find((person) => person.categories.includes(service.category));
  if (!match) throw new Error(`No staff for ${service.name}`);
  return match;
}

export function defaultFacial(): Service {
  return SERVICES[0]!;
}
