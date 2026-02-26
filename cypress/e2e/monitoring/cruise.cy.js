describe('Cruise Product', () => {

  before(() => {
    // Чистим файлы перед запуском, чтобы исключить старые данные
    cy.writeFile('api_status.txt', 'UNKNOWN');
    cy.writeFile('offers_count.txt', 'N/A');
  });

  it('Search Flow - Cruises with Smart Diagnostic', () => {
    cy.viewport(1280, 800);
    
    // 1. ПЕРЕХВАТ API (Используем RegEx для игнорирования query-параметров)
    cy.intercept({ method: 'POST', url: /\/content\/offers/ }).as('cruiseSearch');

    // 2. АВТОРИЗАЦИЯ
    cy.visit('https://test.globaltravel.space/sign-in'); 
    
    cy.xpath("(//input[contains(@class,'input')])[1]")
      .should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });

    cy.xpath("(//input[contains(@class,'input')])[2]")
      .should('be.visible')
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false })
      .type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');
    cy.get('body').should('not.contain', 'Ошибка');
    
    // Переход в Круизы
    cy.visit('https://test.globaltravel.space/cruises');
    cy.url().should('include', '/cruises');

    // 3. ВЫБОР НАПРАВЛЕНИЯ
    cy.get('.p-dropdown-label', { timeout: 15000 })
      .contains('Направление')
      .click({ force: true });
    
    cy.get('.p-dropdown-item')
      .contains('Азия')
      .click({ force: true });

    cy.wait(800); 

    // 4. ВЫБОР ДЛИТЕЛЬНОСТИ
    cy.get('button.duration-selector').should('be.visible').click({ force: true });
    cy.get('.p-overlaypanel-content ul li').first().click({ force: true });
    
    cy.wait(500);

    // 5. ВЫБОР ДИАПАЗОНА ДАТ
    cy.get('input[placeholder="Период выезда"]').click({ force: true });
    cy.get('.p-datepicker', { timeout: 5000 }).should('be.visible');

    // Листаем календарь на 4 месяца вперед
    for(let n = 0; n < 4; n++) {
      cy.get('.p-datepicker-next').filter(':visible').last().click({ force: true });
      cy.wait(400); 
    }

    // Выбор первой даты
    cy.get('.p-datepicker-calendar').filter(':visible')
      .find('td:not(.p-datepicker-other-month)')
      .contains('15').click({ force: true });
    
    cy.wait(500);

    // Выбор второй даты
    cy.get('.p-datepicker-calendar').filter(':visible')
      .find('td:not(.p-datepicker-other-month)')
      .contains('27').click({ force: true });

    cy.get('body').type('{esc}');

    // 6. ПОИСК
    cy.get('button.easy-button.p-button-icon-only').should('be.visible').click({ force: true });

    // 7. УМНАЯ ПРОВЕРКА (API + UI)
    cy.wait('@cruiseSearch', { timeout: 60000 }).then((interception) => {
      const statusCode = interception.response?.statusCode || 500;
      cy.writeFile('api_status.txt', statusCode.toString());

      if (statusCode >= 400) {
        cy.writeFile('offers_count.txt', 'ERROR');
        throw new Error(`🆘 Ошибка сервера API Круизов: HTTP ${statusCode}`);
      }
    });

    // Ожидание рендеринга (Круизы часто грузятся дольше из-за фото и описаний)
    cy.wait(15000);

    cy.get('body').then(($body) => {
      // Ищем карточки круизов по твоему классу
      const allCards = $body.find('.cruise-card');
      let realTicketsCount = 0;

      allCards.each((index, el) => {
        const cardText = Cypress.$(el).text();
        // Проверяем наличие цены или кнопок взаимодействия. 
        // Добавил "Подробнее", так как в круизах кнопка часто называется так.
        if (cardText.includes('UZS') || cardText.includes('сум') || cardText.includes('Выбрать') || cardText.includes('Подробнее')) {
          realTicketsCount++;
        }
      });

      // Записываем финальный результат
      if (realTicketsCount > 0) {
        cy.writeFile('offers_count.txt', realTicketsCount.toString());
        cy.log(`✅ Найдено реальных круизов: ${realTicketsCount}`);
      } else {
        cy.writeFile('offers_count.txt', '0');
        cy.log('⚪ Круизов не найдено (или долгая загрузка)');
      }
    });
  });
});