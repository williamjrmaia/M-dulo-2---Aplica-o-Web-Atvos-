/* Safra Control — JS público (sem dependências externas) */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     Modais
     - abrir: [data-modal-open][data-modal-target="id"]
     - fechar: [data-modal-close], clique no backdrop, tecla ESC
     --------------------------------------------------------- */
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('is-open');
    var focusable = modal.querySelector('button, [href], input, select, textarea');
    if (focusable) focusable.focus();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-open');
  }

  function initModals() {
    var openers = document.querySelectorAll('[data-modal-open]');
    Array.prototype.forEach.call(openers, function (opener) {
      opener.addEventListener('click', function () {
        var targetId = opener.getAttribute('data-modal-target');
        if (!targetId) return;
        openModal(document.getElementById(targetId));
      });
    });

    var closers = document.querySelectorAll('[data-modal-close]');
    Array.prototype.forEach.call(closers, function (closer) {
      closer.addEventListener('click', function () {
        var modal = closer.closest('.modal-backdrop');
        closeModal(modal);
      });
    });

    var backdrops = document.querySelectorAll('.modal-backdrop');
    Array.prototype.forEach.call(backdrops, function (backdrop) {
      backdrop.addEventListener('click', function (event) {
        if (event.target === backdrop) closeModal(backdrop);
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      var open = document.querySelector('.modal-backdrop.is-open');
      if (open) closeModal(open);
    });
  }

  /* ---------------------------------------------------------
     Busca client-side
     - input: [data-search-input][data-search-target="containerId"]
     - itens: [data-search-item] com [data-search-text]
     --------------------------------------------------------- */
  function initSearch() {
    var inputs = document.querySelectorAll('[data-search-input]');
    Array.prototype.forEach.call(inputs, function (input) {
      var targetId = input.getAttribute('data-search-target');
      var scope = targetId ? document.getElementById(targetId) : document;
      if (!scope) return;

      input.addEventListener('input', function () {
        var query = input.value.trim().toLowerCase();
        var items = scope.querySelectorAll('[data-search-item]');
        Array.prototype.forEach.call(items, function (item) {
          var text = (item.getAttribute('data-search-text') || item.textContent || '').toLowerCase();
          item.style.display = text.indexOf(query) !== -1 ? '' : 'none';
        });
      });
    });
  }

  /* ---------------------------------------------------------
     Máscaras simples (CPF/CNPJ e telefone)
     - aplica em [data-mask="cpf-cnpj"] e [data-mask="telefone"]
     --------------------------------------------------------- */
  function maskCpfCnpj(value) {
    var d = value.replace(/\D/g, '').slice(0, 14);
    if (d.length <= 11) {
      return d
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return d
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }

  function maskTelefone(value) {
    var d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 10) {
      return d
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
    }
    return d
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
  }

  function initMasks() {
    var fields = document.querySelectorAll('[data-mask]');
    Array.prototype.forEach.call(fields, function (field) {
      var type = field.getAttribute('data-mask');
      field.addEventListener('input', function () {
        if (type === 'cpf-cnpj') {
          field.value = maskCpfCnpj(field.value);
        } else if (type === 'telefone') {
          field.value = maskTelefone(field.value);
        }
      });
    });
  }

  /* ---------------------------------------------------------
     Fechar alertas/flash
     - botão [data-flash-close] remove o [data-flash] pai
     --------------------------------------------------------- */
  function initFlash() {
    var closers = document.querySelectorAll('[data-flash-close]');
    Array.prototype.forEach.call(closers, function (closer) {
      closer.addEventListener('click', function () {
        var flash = closer.closest('[data-flash]');
        if (flash) flash.remove();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initModals();
    initSearch();
    initMasks();
    initFlash();
  });
})();
