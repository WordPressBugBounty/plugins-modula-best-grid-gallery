// Stroke icons from the Settings artboard. All are decorative: callers hide
// them from assistive technology and name the control with text.

function StrokeIcon({ size = 16, strokeWidth = 1.8, d }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={strokeWidth}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			<path d={d} />
		</svg>
	);
}

export const CopyIcon = () => (
	<StrokeIcon
		size={14}
		strokeWidth={1.7}
		d="M9 9h12v12H9zM5 15V5a2 2 0 012-2h10"
	/>
);

export const CheckIcon = ({ size = 14 }) => (
	<StrokeIcon size={size} strokeWidth={2} d="M5 12l5 5 9-10" />
);

export const ChevronDownIcon = () => (
	<StrokeIcon size={12} strokeWidth={1.7} d="M6 9l6 6 6-6" />
);

export const SearchIcon = () => (
	<StrokeIcon d="M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4" />
);

export const SubgroupIcon = () => (
	<StrokeIcon d="M5 3v8a4 4 0 004 4h11M16 11l4 4-4 4" />
);

export const InfoIcon = () => (
	<StrokeIcon
		size={15}
		strokeWidth={1.7}
		d="M12 8v5M12 16v.01M12 3a9 9 0 100 18 9 9 0 000-18z"
	/>
);

export const WarningIcon = () => (
	<StrokeIcon size={18} d="M12 3l9.5 17h-19zM12 10v4M12 17v.01" />
);

export const ImageIcon = () => (
	<StrokeIcon
		size={20}
		strokeWidth={1.6}
		d="M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5v.01"
	/>
);

export const CloseIcon = ({ size = 12 }) => (
	<StrokeIcon size={size} strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
);

// Follows the label of a link that opens in a new tab.
export const ExternalIcon = () => (
	<StrokeIcon
		size={13}
		strokeWidth={2}
		d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"
	/>
);

export const LockIcon = () => (
	<StrokeIcon
		size={15}
		strokeWidth={1.7}
		d="M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 017 0V11"
	/>
);
