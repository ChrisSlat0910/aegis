import { UserProfile } from './types';

export function buildAnalysisPrompt(profile: UserProfile, alreadyRetired: boolean = false): string {
  const yearsToRetirement = alreadyRetired ? 0 : profile.retirementAge - profile.currentAge;
  const annualBurn = profile.monthlyExpenseMillions * 12;
  const burnYears = (profile.targetFundMillions / annualBurn).toFixed(1);
  const retirementYear = alreadyRetired
    ? new Date().getFullYear()
    : new Date().getFullYear() + yearsToRetirement;
  const lifeExpectancy = profile.currentAge + 30;
  const withdrawalRate = ((annualBurn / profile.targetFundMillions) * 100).toFixed(1);

  const formatRupiah = (millions: number): string => {
    if (millions >= 1000000) return `Rp ${(millions / 1000000).toFixed(1)} Triliun`;
    if (millions >= 1000) return `Rp ${(millions / 1000).toFixed(1)} Miliar`;
    return `Rp ${millions.toLocaleString('id-ID')} Juta`;
  };

  const stocksAmount = profile.targetFundMillions * profile.allocation.stocks / 100;
  const bondsAmount = profile.targetFundMillions * profile.allocation.bonds / 100;
  const cashAmount = profile.targetFundMillions * profile.allocation.cash / 100;
  const cryptoAmount = profile.targetFundMillions * profile.allocation.crypto / 100;

  const retirementContext = alreadyRetired
    ? `- Status: SUDAH PENSIUN — simulasi dimulai sekarang (${retirementYear})
- Usia saat ini: ${profile.currentAge} tahun
- Horizon simulasi: 30 tahun ke depan (hingga usia ${lifeExpectancy} tahun)`
    : `- Status: BELUM PENSIUN — akan pensiun dalam ${yearsToRetirement} tahun
- Usia sekarang: ${profile.currentAge} tahun | Usia pensiun: ${profile.retirementAge} tahun
- Pensiun dimulai: tahun ${retirementYear} | Simulasi berakhir: usia ${lifeExpectancy} tahun`;

  const saranContext = alreadyRetired
    ? `Investor SUDAH PENSIUN. overallVerdict harus fokus pada:
- Kondisi portofolio saat ini dan risiko jangka pendek
- Langkah konkret yang bisa dilakukan SEKARANG (rebalancing, kurangi pengeluaran, cari pendapatan pasif)
- Tone: tidak ada waktu akumulasi lagi, prioritaskan proteksi dan keberlanjutan dana
- Hindari saran yang butuh waktu panjang seperti tingkatkan tabungan bulanan`
    : `Investor BELUM PENSIUN, masih punya ${yearsToRetirement} tahun akumulasi. overallVerdict harus fokus pada:
- Apa yang bisa diperbaiki SEBELUM pensiun
- Langkah konkret: rebalancing alokasi, tingkatkan tabungan, kurangi target pengeluaran
- Tone: masih ada waktu, ini yang bisa kamu lakukan sekarang untuk memperkuat posisi
- Berikan harapan yang realistis, bukan hanya peringatan`;

  const alternativeSolutionInstruction = alreadyRetired
    ? `- alternativeSolution: null (investor sudah pensiun, tidak relevan)`
    : `- alternativeSolution: Jika ada minimal 1 skenario dengan survivalYears < 30, hitung:
  * minimumFund: estimasi total dana minimum dalam format Rupiah Indonesia (Juta/Miliar/Triliun) agar survive SEMUA skenario dengan withdrawal rate ${withdrawalRate}% yang sama
  * recommendedAllocation: komposisi portofolio lebih defensif untuk withdrawal rate ${withdrawalRate}% — total stocks+bonds+cash+crypto HARUS = 100
  * explanation: 2-3 kalimat Bahasa Indonesia mengapa dana dan komposisi tersebut lebih aman
  Jika semua skenario survived (survivalYears >= 30), return null untuk field ini`;

  return `Kamu adalah analis keuangan senior Aegis yang sedang berbicara langsung kepada seorang investor Indonesia. Buat laporan stress test portofolio Post-FIRE yang personal, realistis, dan dalam Bahasa Indonesia.

DATA PORTOFOLIO INVESTOR:
${retirementContext}
- Alokasi: Saham ${profile.allocation.stocks}% (${formatRupiah(stocksAmount)}), Obligasi ${profile.allocation.bonds}% (${formatRupiah(bondsAmount)}), Kas ${profile.allocation.cash}% (${formatRupiah(cashAmount)}), Kripto ${profile.allocation.crypto}% (${formatRupiah(cryptoAmount)})
- Total Dana: ${formatRupiah(profile.targetFundMillions)}
- Pengeluaran: ${formatRupiah(profile.monthlyExpenseMillions)}/bulan (${formatRupiah(annualBurn)}/tahun)
- Rasio penarikan: ${withdrawalRate}% per tahun
- Tanpa pertumbuhan, dana cukup untuk: ${burnYears} tahun

INSTRUKSI PENTING:
1. Semua output WAJIB dalam Bahasa Indonesia
2. Selalu gunakan "kamu" dan "portofoliomu" — bicara langsung ke investor, JANGAN gunakan "kami"
3. Semua skenario WAJIB terjadi SETELAH tahun ${retirementYear}
4. Tahun skenario minimum adalah ${retirementYear}, maksimum ${retirementYear + 25}
5. Sebut usia investor saat skenario terjadi (usia = ${profile.currentAge} + (tahun skenario - ${retirementYear}))
6. Nama skenario harus realistis, spesifik, dan relevan dengan kondisi ekonomi global dan Indonesia. Gunakan pola historis sebagai inspirasi tapi JANGAN copy nama atau tahun yang sama persis
7. Deskripsi harus terasa seperti laporan analis sungguhan — sebut angka konkret dalam format Rupiah Indonesia (Juta/Miliar/Triliun), trigger ekonomi yang masuk akal, dan dampak bertahap yang realistis
8. riskLevel harus persis "high", "medium", atau "low" (huruf kecil)
9. chartData: tepat 6 titik dari tahun ${retirementYear} sampai ${retirementYear + 30}, fundValue WAJIB dalam satuan JUTA RUPIAH (contoh: dana Rp 5 Miliar = 5000, bukan 5000000000)
10. survivalYears: tahun ke berapa (1-30) dana habis, atau 30 jika selamat
11. Buat 3 skenario BERBEDA jenisnya yang paling relevan dengan alokasi portofolio spesifik investor ini
12. portfolioNarrative: analisis kondisi spesifik dalam format Rupiah Indonesia yang mudah dipahami, sebut rasio penarikan ${withdrawalRate}% dan implikasinya
13. safeWithdrawalRate: angka dalam persen antara 1.0 sampai 6.0, contoh: 3.5 bukan 0.035 dan bukan 35
14. ${saranContext}
15. Dalam deskripsi dan narasi, SELALU tulis angka uang dalam format Indonesia: Juta, Miliar, atau Triliun
16. ${alternativeSolutionInstruction}
17. HANYA kembalikan JSON mentah, tanpa markdown, tanpa backtick

{"scenarios":[{"name":"string","year":"string — tahun ${retirementYear} atau lebih","description":"string — 2-3 kalimat Bahasa Indonesia, angka Rupiah, sebut usia investor","probability":"Low|Medium|High","riskLevel":"high|medium|low","impact":{"stocks":number,"bonds":number,"cash":number,"crypto":number},"survivalYears":number,"survivalAmount":number,"chartData":[{"year":number,"fundValue":number}],"verdict":"string — satu kalimat jujur Bahasa Indonesia"}],"portfolioNarrative":"string — 2-3 kalimat Bahasa Indonesia","overallVerdict":"string — mulai dengan Aegis menyarankan...","safeWithdrawalRate":number,"alternativeSolution":null atau {"minimumFund":"string Rupiah","recommendedAllocation":{"stocks":number,"bonds":number,"cash":number,"crypto":number},"explanation":"string Bahasa Indonesia"}}`;
}