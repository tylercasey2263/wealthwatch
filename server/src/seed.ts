import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { encrypt } from './services/encryption.ts';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  // Clear all data in dependency order
  await prisma.auditLog.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.debt.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.financialSnapshot.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password1!', 12);
  const user = await prisma.user.create({
    data: { email: 'demo@example.com', passwordHash, firstName: 'Demo', lastName: 'User' },
  });

  // All text fields are encrypted at rest
  const usaaChecking = await prisma.account.create({
    data: { userId: user.id, name: encrypt('USAA Checking'), institution: encrypt('USAA'), type: 'bank', subtype: 'checking', balance: 3500 },
  });
  const usaaSavings = await prisma.account.create({
    data: { userId: user.id, name: encrypt('USAA Savings'), institution: encrypt('USAA'), type: 'bank', subtype: 'savings', balance: 8200 },
  });
  const navyFed = await prisma.account.create({
    data: { userId: user.id, name: encrypt('Navy Federal Checking'), institution: encrypt('Navy Federal'), type: 'bank', subtype: 'checking', balance: 2100 },
  });
  const capitalOne = await prisma.account.create({
    data: { userId: user.id, name: encrypt('Capital One Card'), institution: encrypt('Capital One'), type: 'credit_card', balance: -2800, creditLimit: 10000, interestRate: 24.99, minimumPayment: 75 },
  });
  const citibank = await prisma.account.create({
    data: { userId: user.id, name: encrypt('Citi Double Cash'), institution: encrypt('Citibank'), type: 'credit_card', balance: -1500, creditLimit: 8000, interestRate: 21.99, minimumPayment: 50 },
  });
  const bridgecrest = await prisma.account.create({
    data: { userId: user.id, name: encrypt('Bridgecrest Auto Loan'), institution: encrypt('Bridgecrest'), type: 'loan', subtype: 'auto_loan', balance: -18500, interestRate: 6.5, minimumPayment: 385 },
  });
  const guideline = await prisma.account.create({
    data: { userId: user.id, name: encrypt('Guideline 401(k)'), institution: encrypt('Guideline'), type: 'investment', subtype: '401k', balance: 45000 },
  });
  const tsp = await prisma.account.create({
    data: { userId: user.id, name: encrypt('TSP Account'), institution: encrypt('TSP'), type: 'investment', subtype: '401k', balance: 32000 },
  });
  const vaIncome = await prisma.account.create({
    data: { userId: user.id, name: encrypt('VA Disability'), institution: encrypt('VA'), type: 'income', subtype: 'disability', balance: 0 },
  });

  await prisma.debt.create({
    data: { accountId: capitalOne.id, name: encrypt('Capital One Credit Card'), originalBalance: 5000, currentBalance: 2800, interestRate: 24.99, minimumPayment: 75, dueDate: 15, startDate: new Date('2024-06-01') },
  });
  await prisma.debt.create({
    data: { accountId: citibank.id, name: encrypt('Citi Double Cash Card'), originalBalance: 3000, currentBalance: 1500, interestRate: 21.99, minimumPayment: 50, dueDate: 20, startDate: new Date('2024-08-01') },
  });
  await prisma.debt.create({
    data: { accountId: bridgecrest.id, name: encrypt('Bridgecrest Auto Loan'), originalBalance: 25000, currentBalance: 18500, interestRate: 6.5, minimumPayment: 385, dueDate: 1, startDate: new Date('2023-01-15') },
  });

  await prisma.investment.create({
    data: { accountId: guideline.id, name: encrypt('Guideline 401(k)'), currentValue: 45000, costBasis: 38000, monthlyContribution: 500, employerMatch: 4, returnRate: 8, allocations: JSON.stringify({ stocks: 80, bonds: 15, cash: 5 }) },
  });
  await prisma.investment.create({
    data: { accountId: tsp.id, name: encrypt('TSP Retirement'), currentValue: 32000, costBasis: 28000, monthlyContribution: 400, employerMatch: 5, returnRate: 7.5, allocations: JSON.stringify({ 'C Fund': 50, 'S Fund': 20, 'I Fund': 15, 'F Fund': 10, 'G Fund': 5 }) },
  });

  const budgetCategories = [
    { category: 'Housing', amount: 1500 },
    { category: 'Transportation', amount: 500 },
    { category: 'Food & Dining', amount: 600 },
    { category: 'Utilities', amount: 200 },
    { category: 'Insurance', amount: 300 },
    { category: 'Entertainment', amount: 150 },
    { category: 'Shopping', amount: 200 },
    { category: 'Health & Fitness', amount: 100 },
    { category: 'Personal Care', amount: 50 },
    { category: 'Subscriptions', amount: 80 },
  ];
  for (const b of budgetCategories) {
    await prisma.budget.create({ data: { userId: user.id, category: b.category, amount: b.amount } });
  }

  // Generate 3 months of transactions with encrypted descriptions
  for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
    const now = new Date();
    const month = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);

    await prisma.transaction.create({
      data: { accountId: usaaChecking.id, date: new Date(month.getFullYear(), month.getMonth(), 1), description: encrypt('Employer Direct Deposit'), amount: 3200, category: 'Salary', type: 'income', isRecurring: true },
    });
    await prisma.transaction.create({
      data: { accountId: usaaChecking.id, date: new Date(month.getFullYear(), month.getMonth(), 15), description: encrypt('Employer Direct Deposit'), amount: 3200, category: 'Salary', type: 'income', isRecurring: true },
    });
    await prisma.transaction.create({
      data: { accountId: navyFed.id, date: new Date(month.getFullYear(), month.getMonth(), 1), description: encrypt('VA Disability Payment'), amount: 1800, category: 'VA Disability', type: 'income', isRecurring: true },
    });

    const expenses = [
      { desc: 'Rent Payment', amount: -1500, cat: 'Housing', account: usaaChecking.id, day: 1 },
      { desc: 'Car Insurance', amount: -180, cat: 'Insurance', account: usaaChecking.id, day: 5 },
      { desc: 'Electric Bill', amount: -120, cat: 'Utilities', account: usaaChecking.id, day: 10 },
      { desc: 'Water Bill', amount: -45, cat: 'Utilities', account: usaaChecking.id, day: 10 },
      { desc: 'Internet', amount: -75, cat: 'Utilities', account: usaaChecking.id, day: 12 },
      { desc: 'Phone Bill', amount: -85, cat: 'Utilities', account: usaaChecking.id, day: 15 },
      { desc: 'Grocery Store', amount: -320, cat: 'Food & Dining', account: capitalOne.id, day: 3 },
      { desc: 'Restaurant', amount: -65, cat: 'Food & Dining', account: capitalOne.id, day: 8 },
      { desc: 'Fast Food', amount: -35, cat: 'Food & Dining', account: capitalOne.id, day: 14 },
      { desc: 'Grocery Store', amount: -280, cat: 'Food & Dining', account: capitalOne.id, day: 18 },
      { desc: 'Gas Station', amount: -55, cat: 'Transportation', account: citibank.id, day: 4 },
      { desc: 'Gas Station', amount: -48, cat: 'Transportation', account: citibank.id, day: 16 },
      { desc: 'Amazon Purchase', amount: -89, cat: 'Shopping', account: capitalOne.id, day: 7 },
      { desc: 'Netflix', amount: -15.99, cat: 'Subscriptions', account: citibank.id, day: 1 },
      { desc: 'Spotify', amount: -10.99, cat: 'Subscriptions', account: citibank.id, day: 1 },
      { desc: 'Gym Membership', amount: -40, cat: 'Health & Fitness', account: usaaChecking.id, day: 1 },
      { desc: 'Haircut', amount: -30, cat: 'Personal Care', account: usaaChecking.id, day: 20 },
      { desc: 'Movie Theater', amount: -25, cat: 'Entertainment', account: citibank.id, day: 12 },
      { desc: 'Bridgecrest Car Payment', amount: -385, cat: 'Transportation', account: usaaChecking.id, day: 1 },
      { desc: 'Capital One Payment', amount: -150, cat: 'Debt Payment', account: usaaChecking.id, day: 15 },
      { desc: 'Citibank Payment', amount: -100, cat: 'Debt Payment', account: usaaChecking.id, day: 20 },
    ];

    for (const exp of expenses) {
      await prisma.transaction.create({
        data: {
          accountId: exp.account,
          date: new Date(month.getFullYear(), month.getMonth(), exp.day),
          description: encrypt(exp.desc),
          amount: exp.amount,
          category: exp.cat,
          type: 'expense',
          isRecurring: ['Rent', 'Insurance', 'Netflix', 'Spotify', 'Gym', 'Internet', 'Phone', 'Car Payment'].some(k => exp.desc.includes(k)),
        },
      });
    }
  }

  console.log('Seed data created successfully!');
  console.log('All sensitive text fields encrypted at rest with AES-256-GCM');
  console.log('Demo login: demo@example.com / Password1!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
