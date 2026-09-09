const ModulaStyle = (props) => {
	const { id, settings } = props;
	const useLegacyEffectStyles =
		!settings.hover_builder || typeof settings.hover_builder !== 'object';

	let style = ``;

	if ('grid' == settings.type) {
		if ('automatic' != settings.grid_type) {
			style += `#modula-${id}.modula-gallery .modula-item, .modula-gallery .modula-grid-sizer { width: calc(${
				100 / settings.grid_type
			}% - ${
				settings.gutter - settings.gutter / settings.grid_type
			}px) !important}`;
		}
	}

	if ('0' != settings.borderSize) {
		style += `#modula-${id} .modula-item {
			border: ${settings.borderSize}px solid ${settings.borderColor};
		}`;
	}

	if ('0' != settings.borderRadius) {
		style += `#modula-${id} .modula-item {
			border-radius: ${settings.borderRadius}px;
		}`;
	}

	if ('0' != settings.shadowSize) {
		style += `#modula-${id} .modula-item {
			box-shadow: ${settings.shadowColor} 0px 0px ${settings.shadowSize}px;
		}`;
	}

	if ('#ffffff' != settings.socialIconColor) {
		style += `#modula-${id} .modula-item .modula-social a {
			color: ${settings.socialIconColor};
		}`;
	}

	if ('16' != settings.socialIconSize) {
		style += `#modula-${id} .modula-item .modula-social svg {
			height: ${settings.socialIconSize}px;
			width: ${settings.socialIconSize}px;
		}`;
	}

	if ('10' != settings.socialIconPadding) {
		style += `#modula-${id} .modula-item .modula-social a:not(:last-child) {
			margin-right: ${settings.socialIconPadding}px;
		}`;
	}

	style += `#modula-${id} .modula-item .caption {
		background-color: ${settings.captionColor};
	}`;

	if ('' != settings.captionColor) {
		style += `#modula-${id} .modula-item .figc {
			color: ${settings.captionColor};
		}`;
	}

	if ('' != settings.titleFontSize && '0' != settings.titleFontSize) {
		style += `#modula-${id} .modula-item .figc .modula-title {
			font-size: ${settings.titleFontSize}px;
		}`;
	}

	if ('' != settings.captionFontSize && '0' != settings.captionFontSize) {
		style += `#modula-${id} .modula-item .figc p.description {
			font-size: ${settings.captionFontSize}px;
		}`;
	}

	style += `#modula-${id} .modula-items .figc p.description {
			color: ${settings.captionColor};
	}`;

	if ('' != settings.titleColor) {
		style += `#modula-${id} .modula-items .figc .modula-title {
			color: ${settings.titleColor};
		}`;
	} else {
		style += `#modula-${id} .modula-items .figc .modula-title {
			color: ${settings.captionColor};
		}`;
	}

	style += `#modula-${id}.modula-gallery .modula-item > a, #modula-${id}.modula-gallery .modula-item, #modula-${id}.modula-gallery .modula-item-content > a:not(.modula-no-follow){
		cursor: ${settings.cursor};
	}`;

	// SEE ABOUT LOADED EFFECT IF WE NEED TO ADD OR NOTTTTTTTTTTTTTT #REMINDER

	if ('custom-grid' != settings.type || 'slider' != settings.type) {
		style += `#modula-${id} {
		width: ${settings.width};
		margin : 0 auto;
		}`;

		if (props.imagesCount == 0) {
			style += `#modula-${id} .modula-items {
				height: 100px;
			}`;
		} else if (
			'grid' != settings.type &&
			'slider' != settings.type &&
			'bnb' != settings.type
		) {
			style += `#modula-${id} .modula-items {
				height: ${settings.height[0]}px;
			}`;
		} else if ('slider' == settings.type) {
			style += `#modula-${id} .modula-items {
				height: auto;
			}`;
		}
	}

	if (undefined != settings.style && 0 != settings.style.length) {
		style += `${settings.style}`;
	}

	//RESPONSIVE FIXES
	let mobileStyle = ``;
	if (
		'' != settings.mobileTitleFontSize &&
		0 != settings.mobileTitleFontSize
	) {
		mobileStyle += `#modula-${id} .modula-item .figc .modula-title {
			font-size: ${settings.mobileTitleFontSize}px
		}`;
	}

	mobileStyle += `#modula-${id} .modula-items .figc p.description {
		color: ${settings.captionColor};
		font-size: ${settings.mobileCaptionFontSize}px;
	}`;
	style += `@media screen and (max-width:480px){
		${mobileStyle}
		}`;

	if (useLegacyEffectStyles) {
		if ('none' == settings.effect) {
			style += `#modula-${id} .modula-items .modula-item:hover img {
			opacity: 1;
		}`;
		}

		style += `#modula-${id}.modula .modula-items .modula-item .modula-item-overlay,   #modula-${id}.modula .modula-items .modula-item.effect-layla,   #modula-${id}.modula .modula-items .modula-item.effect-ruby,  #modula-${id}.modula .modula-items .modula-item.effect-bubba,  #modula-${id}.modula .modula-items .modula-item.effect-sarah,  #modula-${id}.modula .modula-items .modula-item.effect-milo,  #modula-${id}.modula .modula-items .modula-item.effect-julia,  #modula-${id}.modula .modula-items .modula-item.effect-hera,  #modula-${id}.modula .modula-items .modula-item.effect-winston,  #modula-${id}.modula .modula-items .modula-item.effect-selena,  #modula-${id}.modula .modula-items .modula-item.effect-terry,  #modula-${id}.modula .modula-items .modula-item.effect-phoebe,  #modula-${id}.modula .modula-items} .modula-item.effect-apollo,  #modula-${id}.modula .modula-items .modula-item.effect-steve,  #modula-${id}.modula .modula-items .modula-item.effect-ming{ 
		background-color: ${settings.hoverColor};
	}`;

		style += `#modula-${id}.modula .modula-items .modula-item.effect-oscar {
		background: -webkit-linear-gradient(45deg, ${settings.hoverColor} 0, #9b4a1b 40%, ${settings.hoverColor} 100%);
		background: linear-gradient(45deg, ${settings.hoverColor} 0, #9b4a1b 40%, ${settings.hoverColor} 100%);
	}`;

		style += `#modula-${id}.modula .modula-items .modula-item.effect-roxy {
		background: -webkit-linear-gradient(45deg, ${settings.hoverColor} 0, #05abe0 100%);
		background: linear-gradient(45deg, ${settings.hoverColor} 0, #05abe0 100%);
	}`;

		style += `#modula-${id}.modula .modula-items .modula-item.effect-dexter {
		background: -webkit-linear-gradient(top, ${settings.hoverColor} 0, rgba(104,60,19,1) 100%);
		background: linear-gradient(top, ${settings.hoverColor} 0, rgba(104,60,19,1) 100%);
	}`;

		style += `#modula-${id}.modula .modula-items .modula-item.effect-jazz {
		background: -webkit-linear-gradient(-45deg, ${settings.hoverColor} 0, #f33f58 100%);
		background: linear-gradient(-45deg, ${settings.hoverColor} 0, #f33f58 100%);
	}`;

		style += `#modula-${id}.modula .modula-items .modula-item.effect-lexi {
		background: -webkit-linear-gradient(-45deg, ${settings.hoverColor} 0, #fff 100%);
		background: linear-gradient(-45deg, ${settings.hoverColor} 0, #fff 100%);
	}`;

		style += `#modula-${id}.modula .modula-items .modula-item.effect-duke {
		background: -webkit-linear-gradient(-45deg, ${settings.hoverColor} 0, #cc6055 100%);
		background: linear-gradient(-45deg, ${settings.hoverColor} 0, #cc6055 100%);
	}`;

		if (settings.hoverOpacity <= 100 && 'none' != settings.effect) {
			style += `#modula-${id}.modula .modula-items .modula-item:hover img {
			opacity: ${1 - settings.hoverOpacity / 100} ;
		}`;
		}

		style += `#modula-${id}.modula-gallery .modula-item.effect-terry .modula-social a:not(:last-child) {
		margin-bottom: ${settings.socialIconPadding}px;
	}`;
	} else {
		style += `#modula-${id} .modula-item.modula-hover-v2 .modula-item-overlay {
			background-color: ${settings.hoverColor};
		}`;
	}

	if ('default' != settings.titleFontWeight) {
		style += `#modula-${id}.modula .modula-items .modula-item .modula-title {
			font-weight : ${settings.titleFontWeight};
		}`;
	}

	if ('default' != settings.captionFontWeight) {
		style += `#modula-${id}.modula .modula-items .modula-item p.description {
			font-weight : ${settings.captionFontWeight};
		}`;
	}

	if ('slider' == settings.type) {
		if ('true' == jQuery('[aria-label=Settings]').attr('aria-expanded')) {
			style += `#modula-${id} {
					width: 800px;
					}`;
		} else {
			style += `#modula-${id} {
			width: 1100px;
			}`;
		}
		style += `#modula-${id} .modula-items {
		height: auto;
		}`;

		style += `#modula-${id} .modula-item {
		background-color: transparent;
		transform: none;
		}`;
	}

	if (undefined != settings.filters && settings.filters.length > 1) {
		style += `#modula-${id}.modula-gallery .filters {
			text-align: ${settings.filterTextAlignment};
		}`;
	}

	if ('bnb' == settings.type) {
		style +=
			`#modula-${id}.modula.modula-gallery-bnb .modula_bnb_main_wrapper{flex-basis: calc( 50% - ` +
			settings.gutter / 2 +
			`px );}`;
		style +=
			`#modula-${id}.modula.modula-gallery-bnb .modula_bnb_items_wrapper{flex-basis: calc( 50% - ` +
			settings.gutter / 2 +
			`px );gap: ` +
			settings.gutter +
			`px;}`;
	}
	style += `#modula-${id}.modula.modula-gallery.modula-gallery-initialized .modula-item-content{opacity:1;}`;

	return (
		<style
			dangerouslySetInnerHTML={{
				__html: `
      				${style}
    				`,
			}}
		/>
	);
};

export default ModulaStyle;
