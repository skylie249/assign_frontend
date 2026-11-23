import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import type { AssignmentRow, Issue } from '../../api/client';

const STATUS_LABELS: Record<Issue['status'], string> = {
	normal: '정상',
	caution: '주의',
	risk: '위험'
};

function headerCell(text: string) {
	return new TableCell({
		children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
		width: { size: 2000, type: WidthType.DXA }
	});
}

function cell(text: string) {
	return new TableCell({
		children: [new Paragraph(text)],
		width: { size: 2000, type: WidthType.DXA }
	});
}

export interface WeeklyDocxInput {
	teamCode: string;
	weekLabel: string;
	month: string;
	issues: Issue[];
	assignments: AssignmentRow[];
}

export async function buildWeeklyDocx(input: WeeklyDocxInput): Promise<Blob> {
	const issueRows = input.issues.map(
		(issue) =>
			new TableRow({
				children: [
					cell(issue.job_name ?? issue.job_id),
					cell(STATUS_LABELS[issue.status]),
					cell(issue.issue ?? ''),
					cell(issue.action ?? ''),
					cell(issue.due_on ?? '-')
				]
			})
	);

	const assignmentsByMember = new Map<string, AssignmentRow[]>();
	for (const row of input.assignments) {
		const list = assignmentsByMember.get(row.mname ?? row.memail) ?? [];
		list.push(row);
		assignmentsByMember.set(row.mname ?? row.memail, list);
	}
	const assignmentRows = [...assignmentsByMember.entries()].flatMap(([name, rows]) =>
		rows.map(
			(row, i) =>
				new TableRow({
					children: [
						cell(i === 0 ? name : ''),
						cell(row.job_name ?? row.job_id),
						cell(row.role_name ?? ''),
						cell(row.ratio + '%')
					]
				})
		)
	);

	const doc = new Document({
		sections: [
			{
				children: [
					new Paragraph({ text: `${input.teamCode} 주간 보고`, heading: HeadingLevel.HEADING_1 }),
					new Paragraph({ text: input.weekLabel }),
					new Paragraph({ text: '이슈', heading: HeadingLevel.HEADING_2 }),
					issueRows.length
						? new Table({
								width: { size: 10000, type: WidthType.DXA },
								rows: [
									new TableRow({
										children: [
											headerCell('프로젝트'),
											headerCell('상태'),
											headerCell('이슈'),
											headerCell('조치/결정'),
											headerCell('추적 기한')
										]
									}),
									...issueRows
								]
							})
						: new Paragraph('이번 주 등록된 이슈가 없습니다.'),
					new Paragraph({ text: `배치 현황 (${input.month})`, heading: HeadingLevel.HEADING_2 }),
					assignmentRows.length
						? new Table({
								width: { size: 10000, type: WidthType.DXA },
								rows: [
									new TableRow({
										children: [
											headerCell('구성원'),
											headerCell('프로젝트'),
											headerCell('역할'),
											headerCell('투입률')
										]
									}),
									...assignmentRows
								]
							})
						: new Paragraph('이번 달 등록된 배치가 없습니다.')
				]
			}
		]
	});

	return Packer.toBlob(doc);
}

export function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
