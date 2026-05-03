import type { PrismaClient } from '@prisma/client';

// Password hashes for demo users
const HASH_EMP123 = '$2a$12$ZElZcG9w7nZyzw3Zy3KUHOMHX7U3sj2fz58AmTmZBA74Gp38E4xwe'; // EMP123
const HASH_TP123 = '$2a$12$.ZwyMl/oAxBt4sGzBpUwW.LUAdrjm1zCBsLjEwGzvetJuAgTo5JIC'; // TP123
const HASH_ADMIN123 = '$2a$12$KpYCaVomz0m7gW/ocaEDS.iyWFt1ntIh7ovJc/NV3cA3tw.MrwiUO'; // admin123
const SEED_PASSWORD_HASH = HASH_EMP123; // fallback for individual

export async function seedUsers(prisma: PrismaClient) {
  console.log('Seeding users...');

  // Admin user — login: admin@trainingmarket.my / admin123
  const admin = await prisma.user.upsert({
    where: { email: 'admin@trainingmarket.my' },
    update: { password_hash: HASH_ADMIN123 },
    create: {
      role: 'admin',
      full_name: 'System Admin',
      email: 'admin@trainingmarket.my',
      password_hash: HASH_ADMIN123,
      status: 'active',
      email_verified: true,
    },
  });

  // Employer — login: EMP1@demo.com / EMP123
  const employer = await prisma.user.upsert({
    where: { email: 'EMP1@demo.com' },
    update: { password_hash: HASH_EMP123 },
    create: {
      role: 'employer',
      full_name: 'Ahmad Razak',
      email: 'EMP1@demo.com',
      phone: '+60121234567',
      password_hash: HASH_EMP123,
      status: 'active',
      email_verified: true,
      employer_profile: {
        create: {
          company_name: 'Acme Manufacturing Sdn Bhd',
          registration_no: '202001012345',
          industry: 'Manufacturing',
          company_size: '100-499',
          contact_person: 'Ahmad Razak',
          city: 'Petaling Jaya',
          state: 'Selangor',
          postcode: '47301',
          hrd_corp_registered: true,
          hrd_corp_levy_balance: 50000,
          training_interests: ['Leadership', 'Safety', 'Lean Manufacturing', 'Industry 4.0'],
          profile_completion_pct: 85,
        },
      },
    },
  });

  // Sample individual
  const individual = await prisma.user.upsert({
    where: { email: 'individual@demo.com' },
    update: {},
    create: {
      role: 'individual',
      full_name: 'Siti Nurhaliza',
      email: 'individual@demo.com',
      phone: '+60129876543',
      password_hash: SEED_PASSWORD_HASH,
      status: 'active',
      email_verified: true,
      individual_profile: {
        create: {
          occupation: 'Marketing Executive',
          education_level: 'Degree',
          city: 'Kuala Lumpur',
          state: 'Kuala Lumpur',
          skill_interests: ['Digital Marketing', 'SEO', 'Data Analytics', 'Leadership'],
          career_goals: 'Transition into digital marketing management role',
          preferred_training_mode: 'hybrid',
          profile_completion_pct: 90,
        },
      },
    },
  });

  // Training Provider — login: TP1@demo.com / TP123
  const provider = await prisma.user.upsert({
    where: { email: 'TP1@demo.com' },
    update: { password_hash: HASH_TP123 },
    create: {
      role: 'provider',
      full_name: 'Lee Wei Ming',
      email: 'TP1@demo.com',
      phone: '+60131112222',
      password_hash: HASH_TP123,
      status: 'active',
      email_verified: true,
      provider_profile: {
        create: {
          provider_name: 'Excel Training Academy Sdn Bhd',
          registration_no: '201901054321',
          business_description:
            'Leading corporate training provider specializing in leadership development, sales excellence, and operational efficiency programs for Malaysian businesses.',
          contact_person: 'Lee Wei Ming',
          contact_email: 'info@excelacademy.com.my',
          contact_phone: '+60377771234',
          city: 'Kuala Lumpur',
          state: 'Kuala Lumpur',
          postcode: '50450',
          website: 'https://excelacademy.com.my',
          accreditation_details: 'HRDF Registered Training Provider, ISO 9001:2015 Certified',
          quality_tier: 'verified',
          verification_status: 'verified',
          verified_at: new Date(),
          hrd_corp_registered_provider: true,
          hrd_corp_provider_id: 'HRD-TP-12345',
          response_rate: 92,
          average_response_time: 4.5,
          average_rating: 4.5,
          total_completed_programs: 35,
          profile_completion_pct: 95,
        },
      },
    },
  });

  console.log(`  Created 4 users (admin, employer, individual, provider)`);
}
