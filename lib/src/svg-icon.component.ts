import { Component, DoCheck, ElementRef, HostBinding, Input,
	KeyValueChangeRecord, KeyValueChanges, KeyValueDiffer, KeyValueDiffers,
	OnChanges, OnDestroy, OnInit, Renderer2, SimpleChange } from '@angular/core';

import { Subscription } from 'rxjs';

import { SvgIconRegistryService } from './svg-icon-registry.service';


@Component({
	selector: 'svg-icon',
	styles: [ `:host { display: inline-block; }` ],
	template: '<ng-content></ng-content>'
})

export class SvgIconComponent implements OnInit, OnDestroy, OnChanges, DoCheck {
	@Input() src: string;
	@Input() name: string;
	@Input() stretch = false;
	@Input() applyCss = false;

	// Adapted from ngStyle
	@Input()
	set svgStyle(v: {[key: string]: string }) {
		this._svgStyle = v;
		if (!this.differ && v) {
			this.differ = this.differs.find(v).create();
		}
	}

	private svg: SVGElement;
	private icnSub: Subscription;
	private differ: KeyValueDiffer<string, string|number>;
	private _svgStyle: {[key: string]: string};

	constructor(private element: ElementRef,
		private differs: KeyValueDiffers,
		private renderer: Renderer2,
		private iconReg: SvgIconRegistryService) {
	}

	ngOnInit() {
		this.init();
	}

	ngOnDestroy() {
		this.destroy();
	}

	ngOnChanges(changeRecord: {[key: string]: SimpleChange}) {
		if (changeRecord['src'] || changeRecord['name']) {
			if (this.svg) {
				this.destroy();
			}
			this.init();
		}
		if (changeRecord['stretch']) {
			this.stylize();
		}
	}

	ngDoCheck() {
		if (this.svg && this.differ) {
			const changes = this.differ.diff(this._svgStyle);
			if (changes) {
				this.applyChanges(changes);
			}
		}
	}

	private init() {
		if (this.name) {
			this.icnSub = this.iconReg.getSvgByName(this.name).subscribe(this.initSvg.bind(this));
			return;
		}
		this.icnSub = this.iconReg.loadSvg(this.src).subscribe(this.initSvg.bind(this));
	}

	private initSvg(svg: SVGElement) : void {
		this.setSvg(svg);
		this.resetDiffer();
	}

	private destroy() {
		this.svg = undefined;
		this.differ = undefined;
		if (this.icnSub) {
			this.icnSub.unsubscribe();
		}
	}

	private resetDiffer() {
		if (this._svgStyle && !this.differ) {
			this.differ = this.differs.find(this._svgStyle).create();
		}
	}

	private setSvg(svg: SVGElement) {
		if (svg) {
			this.svg = svg;
			const icon = <SVGElement>svg.cloneNode(true);
			const elem = this.element.nativeElement;

			if (this.applyCss) {
				this.copyNgContentAttribute(elem, icon);
			}

			elem.innerHTML = '';
			this.renderer.appendChild(elem, icon);

			this.stylize();
		}
	}

	private copyNgContentAttribute(hostElem: any, icon: SVGElement) {
		const attributes = <NamedNodeMap>hostElem.attributes;
		const len = attributes.length;
		for (let i = 0; i < len; i += 1) {
			const attribute = attributes.item(i);
			if (attribute.name.startsWith('_ngcontent')) {
				this.setNgContentAttribute(icon, attribute.name);
				break;
			}
		}
	}

	private setNgContentAttribute(parent: Node, attributeName: string) {
		this.renderer.setAttribute(parent, attributeName, '');
		const len = parent.childNodes.length;
		for (let i = 0; i < len; i += 1) {
			const child = parent.childNodes[i];
			if (child instanceof Element) {
				this.setNgContentAttribute(child, attributeName);
			}
		}
	}

	private stylize() {
		if (this.svg) {
			const svg = this.element.nativeElement.firstChild;

			if (this.stretch === true) {
				this.renderer.setAttribute(svg, 'preserveAspectRatio', 'none');
			} else if (this.stretch === false) {
				this.renderer.removeAttribute(svg, 'preserveAspectRatio');
			}
		}
	}

	private applyChanges(changes: KeyValueChanges<string, string|number>) {
		changes.forEachRemovedItem((record: KeyValueChangeRecord<string, string|number>) => this.setStyle(record.key, null));
		changes.forEachAddedItem((record: KeyValueChangeRecord<string, string|number>) => this.setStyle(record.key, record.currentValue));
		changes.forEachChangedItem((record: KeyValueChangeRecord<string, string|number>) => this.setStyle(record.key, record.currentValue));
	}

	private setStyle(nameAndUnit: string, value: string|number|null|undefined) {
		const [name, unit] = nameAndUnit.split('.');
		value = value !== null && unit ? `${value}${unit}` : value;
		const svg = this.element.nativeElement.firstChild;

		if (value !== null) {
			this.renderer.setStyle(svg, name, value as string);
		} else {
			this.renderer.removeStyle(svg, name);
		}
	}
}
