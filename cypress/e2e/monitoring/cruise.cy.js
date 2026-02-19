describe('Cruise Product', () => {
  it('Search Flow - Cruises', () => {
    cy.viewport(1280, 800);
    
    // Перехватываем API поиска
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

  // 2. ВЫБОР НАПРАВЛЕНИЯ (Dropdown)
    cy.get('.p-dropdown-label', { timeout: 10000 })
      .contains('Направление')
      .should('be.visible')
      .click({ force: true });
    
    cy.get('.p-dropdown-item', { timeout: 10000 })
      .contains('Азия')
      .should('be.visible')
      .click({ force: true });

    cy.wait(800); 

    // 3. ВЫБОР ДЛИТЕЛЬНОСТИ
    cy.get('button.duration-selector').should('be.visible').click({ force: true });
    
    cy.get('.p-overlaypanel-content ul li')
      .first()
      .should('be.visible')
      .click({ force: true });
    
    cy.wait(500);

/// 4. ВЫБОР ДИАПАЗОНА ДАТ (+4 месяца от сегодня, длительность 12 дней)
    cy.get('input[placeholder="Период выезда"]')
      .should('be.visible')
      .click({ force: true });

    // Ждем появления календаря
    cy.get('.p-datepicker', { timeout: 5000 }).should('be.visible');

    // 4.1. Листаем на 4 месяца вперед
    for(let n = 0; n < 4; n++) {
      cy.get('.p-datepicker-next')
        .filter(':visible')
        .last() 
        .click({ force: true });
      cy.wait(400); 
    }

    // 4.2. Кликаем на ПЕРВУЮ дату (например, 15-е число)
    cy.get('.p-datepicker-calendar')
      .filter(':visible')
      .find('td:not(.p-datepicker-other-month)')
      .contains('15') 
      .click({ force: true });
    
    cy.log('Выбрана дата начала');
    cy.wait(300); // Короткая пауза, чтобы календарь зафиксировал первый клик

    // 4.3. Кликаем на ВТОРУЮ дату (+12 дней = 27-е число)
    // В некоторых календарях нужно кликнуть в той же таблице
    cy.get('.p-datepicker-calendar')
      .filter(':visible')
      .find('td:not(.p-datepicker-other-month)')
      .contains('27') 
      .click({ force: true });

    cy.log('Выбрана дата конца (диапазон +12 дней)');
    
    // Закрываем календарь
    cy.get('body').type('{esc}');

    // 5. ПОИСК
    cy.get('button.easy-button.p-button-icon-only')
      .should('be.visible')
      .click({ force: true });

    // 6. ПРОВЕРКА РЕЗУЛЬТАТОВ (Используем .ticket-card как на фото ЖД)
    // Увеличил таймаут, так как круизы ищутся долго
    cy.get('.ticket-card', { timeout: 60000 }).should('be.visible');

    // Ждем завершения API запроса
    cy.wait('@cruiseSearch', { timeout: 30000 });

    cy.get('.ticket-card:visible').then(($items) => {
      const count = $items.length;
      cy.log(`Найдено круизов: ${count}`);
      cy.writeFile('offers_count.txt', count.toString());
      expect(count).to.be.greaterThan(0);
    });
  });
});