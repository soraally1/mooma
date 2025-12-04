export interface PregnancyWeekDescription {
    week: number;
    size: string;
    comparison: string;
    medicalNote: string;
}

const pregnancyDescriptions: PregnancyWeekDescription[] = [
    { week: 4, size: '0.2 cm', comparison: 'Seperti biji wijen kecil.', medicalNote: 'Dimulai sebagai embrio, ukurannya sangat mungil.' },
    { week: 5, size: '0.4 cm', comparison: 'Seperti biji beras (sangat panjang dan ramping).', medicalNote: 'Organ-organ vital mulai berkembang pesat.' },
    { week: 6, size: '0.8 cm', comparison: 'Seperti lensa kontak atau biji kacang polong pipih.', medicalNote: 'Detak jantung biasanya sudah terdeteksi.' },
    { week: 7, size: '1.3 cm', comparison: 'Seukuran buah beri biru (blueberry) yang matang.', medicalNote: 'Tunas tangan dan kaki mulai terlihat.' },
    { week: 8, size: '1.6 cm', comparison: 'Seukuran kacang merah atau raspberry.', medicalNote: 'Jari-jari tangan dan kaki mulai terbentuk.' },
    { week: 9, size: '2.3 cm', comparison: 'Seukuran buah anggur kecil.', medicalNote: 'Ekor embrio menghilang, mulai terlihat seperti manusia mini.' },
    { week: 10, size: '3.1 cm', comparison: 'Seukuran buah kumquat atau permen marshmallow besar.', medicalNote: 'Janin menyelesaikan fase embrionik.' },
    { week: 11, size: '4.1 cm', comparison: 'Seukuran buah strawberry.', medicalNote: 'Mulai bisa cegukan dan menendang (belum terasa).' },
    { week: 12, size: '5.4 cm', comparison: 'Seukuran kapur tulis besar, atau buah limau nipis kecil.', medicalNote: 'Refleks mulai berkembang.' },
    { week: 13, size: '7.4 cm', comparison: 'Seukuran kotak korek api panjang, atau lemon kecil.', medicalNote: 'Perumpamaan CRL berakhir di sini; janin mulai diukur dari kepala ke tumit.' },
    { week: 14, size: '8.7 cm', comparison: 'Seukuran bola bisbol (ukuran dari ujung ke ujung).', medicalNote: 'Janin memiliki sidik jari unik.' },
    { week: 16, size: '11.6 cm', comparison: 'Seukuran buah alpukat kecil, atau DVD bundar.', medicalNote: 'Pertumbuhan rambut (lanugo) dimulai.' },
    { week: 18, size: '14.2 cm', comparison: 'Seukuran terong kecil atau kaleng minuman soda.', medicalNote: 'Jenis kelamin sudah dapat terlihat.' },
    { week: 20, size: '16.5 cm', comparison: 'Seukuran pisang standar.', medicalNote: 'Setengah perjalanan kehamilan!' },
    { week: 22, size: '27.8 cm', comparison: 'Seukuran boneka beruang kecil yang panjang.', medicalNote: 'Janin mulai berbaring di lemak coklat.' },
    { week: 24, size: '30.0 cm', comparison: 'Seukuran sehelai kertas A4 yang panjang.', medicalNote: 'Rambut di kepala mulai tumbuh lebih jelas.' },
    { week: 26, size: '35.6 cm', comparison: 'Seukuran kue bolu besar atau kepala kubis (cabbage).', medicalNote: 'Janin mulai membuka mata.' },
    { week: 28, size: '37.6 cm', comparison: 'Seukuran labu siam atau roti baguette kecil.', medicalNote: 'Janin sering mengubah posisi.' },
    { week: 30, size: '40.0 cm', comparison: 'Seukuran kepala selada (lettuce) besar.', medicalNote: 'Paru-paru hampir matang.' },
    { week: 32, size: '42.4 cm', comparison: 'Seukuran amplop panjang atau kotak sereal besar.', medicalNote: 'Lapisan lemak terus menumpuk.' },
    { week: 34, size: '45.2 cm', comparison: 'Seukuran nanas besar.', medicalNote: 'Janin biasanya sudah berada di posisi kepala di bawah.' },
    { week: 36, size: '47.4 cm', comparison: 'Seukuran semangka kecil.', medicalNote: 'Janin siap untuk lahir.' },
    { week: 40, size: '50.8 cm', comparison: 'Seukuran loyang kue bundar besar, atau bayi sungguhan!', medicalNote: 'Kelahiran penuh waktu.' },
];

/**
 * Get pregnancy description for a specific week
 * @param week - The pregnancy week (1-40)
 * @returns The description for the closest available week
 */
export function getPregnancyDescription(week: number): PregnancyWeekDescription {
    // Find the closest week in our data
    const closestDescription = pregnancyDescriptions.reduce((prev, curr) =>
        Math.abs(curr.week - week) < Math.abs(prev.week - week) ? curr : prev
    );

    return closestDescription;
}

/**
 * Get all available pregnancy descriptions
 * @returns Array of all pregnancy week descriptions
 */
export function getAllPregnancyDescriptions(): PregnancyWeekDescription[] {
    return pregnancyDescriptions;
}
