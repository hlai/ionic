import { Component, ComponentInterface, Element, Host, Prop, h, readTask, writeTask } from '@stencil/core';

import { getIonMode } from '../../global/ionic-global';

import { cloneElement, createHeaderIndex, handleContentScroll, handleToolbarIntersection, setHeaderActive } from './header.utils';
/**
 * @virtualProp {"ios" | "md"} mode - The mode determines which platform styles to use.
 */
@Component({
  tag: 'ion-header',
  styleUrls: {
    ios: 'header.ios.scss',
    md: 'header.md.scss'
  }
})
export class Header implements ComponentInterface {

  private collapsibleHeaderInitialized = false;
  private scrollEl?: HTMLElement;
  private contentScrollCallback?: any;
  private intersectionObserver?: any;

  @Element() el!: HTMLElement;

  /**
   * Describes the scroll effect that will be applied to the header
   * `condense` only applies in iOS mode.
   *
   * Typically used for [Collapsible Large Titles](https://ionicframework.com/docs/api/title#collapsible-large-titles)
   */
  @Prop() collapse?: 'condense';

  /**
   * If `true`, the header will be translucent.
   * Only applies when the mode is `"ios"` and the device supports
   * [`backdrop-filter`](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter#Browser_compatibility).
   *
   * Note: In order to scroll content behind the header, the `fullscreen`
   * attribute needs to be set on the content.
   */
  @Prop() translucent = false;

  async componentDidLoad() {
    await this.checkCollapsibleHeader();
  }

  async componentDidUpdate() {
    await this.checkCollapsibleHeader();
  }

  componentDidUnload() {
    this.destroyCollapsibleHeader();
  }

  private async checkCollapsibleHeader() {

    // Determine if the header can collapse
    const hasCollapse = this.collapse === 'condense';
    const canCollapse = (hasCollapse && getIonMode(this) === 'ios') ? hasCollapse : false;

    if (!canCollapse && this.collapsibleHeaderInitialized) {
      this.destroyCollapsibleHeader();
    } else if (canCollapse && !this.collapsibleHeaderInitialized) {
      const tabs = this.el.closest('ion-tabs');
      const page = this.el.closest('ion-app,ion-page,.ion-page,page-inner');

      const pageEl = (tabs) ? tabs : (page) ? page : null;
      const contentEl = (pageEl) ? pageEl.querySelector('ion-content') : null;

      await this.setupCollapsibleHeader(contentEl, pageEl);
    }
  }

  private destroyCollapsibleHeader() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = undefined;
    }

    if (this.scrollEl && this.contentScrollCallback) {
      this.scrollEl.removeEventListener('scroll', this.contentScrollCallback);
      this.contentScrollCallback = undefined;
    }
  }

  private async setupCollapsibleHeader(contentEl: HTMLIonContentElement | null, pageEl: Element | null) {
    if (!contentEl || !pageEl) { console.error('ion-header requires a content to collapse, make sure there is an ion-content.'); return; }

    this.scrollEl = await contentEl.getScrollElement();

    readTask(() => {
      const headers = pageEl.querySelectorAll('ion-header');
      const mainHeader = Array.from(headers).find((header: any) => header.collapse !== 'condense') as HTMLElement | undefined;

      if (!mainHeader || !this.scrollEl) { return; }

      const mainHeaderIndex = createHeaderIndex(mainHeader);
      const scrollHeaderIndex = createHeaderIndex(this.el);

      if (!mainHeaderIndex || !scrollHeaderIndex) { return; }

      setHeaderActive(mainHeaderIndex, false);

      // TODO: Find a better way to do this
      let remainingHeight = 0;
      for (let i = 1; i <= scrollHeaderIndex.toolbars.length - 1; i++) {
        remainingHeight += scrollHeaderIndex.toolbars[i].el.clientHeight;
      }

      /**
       * Handle interaction between toolbar collapse and
       * showing/hiding content in the primary ion-header
       */
      const toolbarIntersection = (ev: any) => { handleToolbarIntersection(ev, mainHeaderIndex, scrollHeaderIndex); };

      readTask(() => {
        const mainHeaderHeight = mainHeaderIndex.el.clientHeight;
        this.intersectionObserver = new IntersectionObserver(toolbarIntersection, { threshold: 0.25, rootMargin: `-${mainHeaderHeight}px 0px 0px 0px` });
        this.intersectionObserver.observe(scrollHeaderIndex.toolbars[0].el);
      });

      /**
       * Handle scaling of large iOS titles and
       * showing/hiding border on last toolbar
       * in primary header
       */
      this.contentScrollCallback = () => { handleContentScroll(this.scrollEl!, mainHeaderIndex, scrollHeaderIndex, remainingHeight); };
      this.scrollEl.addEventListener('scroll', this.contentScrollCallback);
    });

    writeTask(() => {
      cloneElement('ion-title');
      cloneElement('ion-back-button');
    });

    this.collapsibleHeaderInitialized = true;
  }

  render() {
    const mode = getIonMode(this);
    const collapse = this.collapse || 'none';
    return (
      <Host
        role="banner"
        class={{
          [mode]: true,

          // Used internally for styling
          [`header-${mode}`]: true,

          [`header-translucent`]: this.translucent,
          [`header-collapse-${collapse}`]: true,
          [`header-translucent-${mode}`]: this.translucent,
        }}
      >
      </Host>
    );
  }
}
