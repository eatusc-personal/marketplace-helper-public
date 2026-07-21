// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import {
  checkCraigslistPostingPage,
  chooseCraigslistCategory,
  fillCraigslistForm
} from './craigslist';

describe('fillCraigslistForm', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form>
        <input name="PostingTitle" type="text">
        <input name="price" type="text">
        <textarea name="PostingBody"></textarea>
        <input name="postal" type="text">
        <input name="geographic_area" type="text">
        <input name="FromEMail" type="text">
      </form>
    `;
  });

  it('fills the posting fields and reports per-field results', () => {
    const result = fillCraigslistForm({
      title: 'Mid-century desk',
      price: '120',
      description: 'Solid wood, light wear.',
      zipcode: '94110',
      city: 'Mission District',
      email: 'seller@example.com'
    });

    expect(result.success).toBe(true);
    expect((document.querySelector('input[name="PostingTitle"]') as HTMLInputElement).value).toBe('Mid-century desk');
    expect((document.querySelector('input[name="price"]') as HTMLInputElement).value).toBe('120');
    expect((document.querySelector('textarea[name="PostingBody"]') as HTMLTextAreaElement).value).toBe('Solid wood, light wear.');
    expect((document.querySelector('input[name="postal"]') as HTMLInputElement).value).toBe('94110');
    expect((document.querySelector('input[name="geographic_area"]') as HTMLInputElement).value).toBe('Mission District');
    expect((document.querySelector('input[name="FromEMail"]') as HTMLInputElement).value).toBe('seller@example.com');
    expect(result.results?.filter(entry => entry.includes('filled'))).toHaveLength(6);
  });

  it('reports missing fields without failing the whole fill', () => {
    document.body.innerHTML = '<form></form>';

    const result = fillCraigslistForm({ title: 'Mid-century desk' });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results?.[0]).toMatch(/Title field not found/);
  });
});

describe('chooseCraigslistCategory', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="json-form-item select id category-select"></div>
      <form>
        <input type="radio" name="id" value="141">
        <input type="radio" name="id" value="96">
        <button type="submit" name="go" value="Continue">continue</button>
      </form>
    `;
    // jsdom does not implement form submission; keep the continue click inert.
    document.querySelector('form')?.addEventListener('submit', event => event.preventDefault());
  });

  it('maps the category name to its Craigslist id and selects the radio', () => {
    const result = chooseCraigslistCategory('Furniture');

    expect(result.success).toBe(true);
    const furnitureRadio = document.querySelector('input[name="id"][value="141"]') as HTMLInputElement;
    expect(furnitureRadio.checked).toBe(true);
  });

  it('rejects categories that are not in the mapping', () => {
    const result = chooseCraigslistCategory('Time Machines');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found in mapping/);
  });
});

describe('checkCraigslistPostingPage', () => {
  it('recognizes the posting details form page', () => {
    document.body.innerHTML = '<form><input name="PostingTitle" type="text"></form>';

    const result = checkCraigslistPostingPage();

    expect(result.success).toBe(true);
    expect(result.message).toBe('On form details page');
  });

  it('recognizes the posting type selection page', () => {
    document.body.innerHTML = '<form><input type="radio" name="id" value="fso"></form>';

    const result = checkCraigslistPostingPage();

    expect(result.success).toBe(true);
    expect(result.message).toBe('On posting type selection page');
  });

  it('reports unrecognized pages as a failure', () => {
    document.body.innerHTML = '<main><p>Unrelated page</p></main>';

    const result = checkCraigslistPostingPage();

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Not on a recognized/);
  });
});
