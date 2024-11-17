import XLSX from 'xlsx';

export async function processExcelFile(file: ArrayBuffer): Promise<unknown> {
	const workbook = XLSX.read(file);
	const sheetname = workbook.SheetNames[0];
	const worksheet = workbook.Sheets[sheetname];
	// header: 1 generates arrays of data from worksheet objects.
	const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
	return data
	console.log(data);
        // [
        //     [ 'https://youtube.com/watch?v=8cjMIPP-vJc&si=cxgL_oz-13E4yOVv' ],
        //     [ 'https://youtube.com/watch?v=R4dAH2cqEP4&si=2YqvvVINoGgKjQsS' ],
        //     [ 'https://youtube.com/watch?v=ONq1CloO5IY&si=iccty3at3CtCxRnw' ],
        //     [ 'https://youtube.com/watch?v=sX8MS0R9VK4?si=N1z3jC_DJov-pDrg' ]
        //   ]
}

const response = await fetch(
	'https://cdn.discordapp.com/attachments/1307319223617458218/1307689851176353882/test_bot.xlsx?ex=673b3894&is=6739e714&hm=c067e80a40fb366cdde6ae083f68a2d34debb6d8bead11ff79caabdf087379bb&'
);
const file = await response.arrayBuffer();
processExcelFile(file);
