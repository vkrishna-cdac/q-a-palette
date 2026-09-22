CREATE TABLE `qa_items` (
	`id` text PRIMARY KEY NOT NULL,
	`source_doc` text NOT NULL,
	`subject` text NOT NULL,
	`section` text NOT NULL,
	`chunk_name` text NOT NULL,
	`chunk_page_range` text NOT NULL,
	`cited_manual` text NOT NULL,
	`cited_page` text NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`cot` text NOT NULL,
	`chunk_content` text NOT NULL,
	`manual` integer NOT NULL,
	`raw` text NOT NULL,
	`created_at` integer NOT NULL
);
