describe('Cruise Product', () => {
  it('Search Flow - Cruises', () => {
    cy.viewport(1280, 800);
    
    cy.intercept('POST', '**/content/offers/**').as('cruiseSearch');

    // 1. АВТОРИЗАЦИЯ
    cy.visit('https://test.globaltravel.space/sign-in'); 
    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');
    
    // Переход в Круизы
    cy.visit('https://test.globaltravel.space/cruises');
    cy.url().should('include', '/cruises');

    // 2. ВЫБОР НАПРАВЛЕНИЯ
    cy.get('.p-dropdown-label', { timeout: 15000 })
      .contains('Направление')
      .click({ force: true });
    
    cy.get('.p-dropdown-item')
      .contains('Азия')
      .click({ force: true });

    cy.wait(800); 

    // 3. ВЫБОР ДЛИТЕЛЬНОСТИ
    cy.get('button.duration-selector').should('be.visible').click({ force: true });
    cy.get('.p-overlaypanel-content ul li').first().click({ force: true });
    
    cy.wait(500);

    // 4. ВЫБОР ДИАПАЗОНА ДАТ
    cy.get('input[placeholder="Период выезда"]').click({ force: true });
    cy.get('.p-datepicker', { timeout: 5000 }).should('be.visible');

    for(let n = 0; n < 4; n++) {
      cy.get('.p-datepicker-next').filter(':visible').last().click({ force: true });
      cy.wait(400); 
    }

    cy.get('.p-datepicker-calendar').filter(':visible')
      .find('td:not(.p-datepicker-other-month)')
      .contains('15').click({ force: true });
    
    cy.wait(500);

    cy.get('.p-datepicker-calendar').filter(':visible')
      .find('td:not(.p-datepicker-other-month)')
      .contains('27').click({ force: true });

    cy.get('body').type('{esc}');

    // 5. ПОИСК
    cy.get('button.easy-button.p-button-icon-only').click({ force: true });

    // 6. ПРОВЕРКА РЕЗУЛЬТАТОВ 
    cy.wait('@cruiseSearch', { timeout: 60000 }).then((xhr) => {
        expect(xhr.response.statusCode).to.be.oneOf([200, 201]);
    });

    cy.get('.cruise-card', { timeout: 30000 })
      .should('be.visible')
      .then(($items) => {
        const count = $items.length;
        cy.log(`Найдено круизов: ${count}`);
        cy.writeFile('offers_count.txt', count.toString());
        expect(count).to.be.greaterThan(0);
      });
  });
});