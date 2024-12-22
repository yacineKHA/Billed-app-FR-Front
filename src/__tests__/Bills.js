/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import Bills from "../containers/Bills.js";
import router from "../app/Router.js";
import mockStore from "../__mocks__/store.js";

describe("Given I am connected as an employee", () => {

  // Config initiale => simul un employé connecté
  beforeEach(() => {
    // Configurer localStorage avant chaque test
    Object.defineProperty(window, "localStorage", { value: localStorageMock });
    window.localStorage.setItem(
      "user",
      JSON.stringify({
        type: "Employee",
      })
    );
  });

  describe("When I am on Bills Page", () => {
    describe("And the layout is loaded", () => {
      test("Then bill icon in vertical layout should be highlighted", async () => {

        // Créer un élément racine div avec l'id "root"
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.append(root);

        router();
        window.onNavigate(ROUTES_PATH.Bills);

        await waitFor(() => screen.getByTestId("icon-window"));
        const windowIcon = screen.getByTestId("icon-window");
        expect(windowIcon.classList.contains("active-icon")).toBe(true);
      });
    });

    describe("And bills are displayed", () => {
      test("Then bills should be ordered from earliest to latest", () => {
        document.body.innerHTML = BillsUI({ data: bills })
        const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
        const antiChrono = (a, b) => ((a < b) ? 1 : -1)
        const datesSorted = [...dates].sort(antiChrono)
        expect(dates).toEqual(datesSorted)
      });

      test("Then bills should be rendered correctly", () => {
        // Rendu de la page
        const html = BillsUI({ data: bills });
        document.body.innerHTML = html;

        // Vérif que les éléments sont bien présents
        expect(screen.getAllByText("Mes notes de frais")).toBeTruthy();
        expect(screen.getByTestId("btn-new-bill")).toBeTruthy();
        expect(screen.getAllByTestId("icon-eye")).toBeTruthy();
      });
    });

    describe("And I interact with the interface", () => {
      test("Then clicking the NewBill button should navigate to the NewBill form", () => {
        const onNavigate = jest.fn();
        document.body.innerHTML = BillsUI({ data: [] });

        // Instanciation de Bills
        const billsInstance = new Bills({
          document,
          onNavigate,
          store: null,
          localStorage: window.localStorage,
        });

        // Instanciation de handleClickNewBill
        const handleClickNewBillSpy = jest.spyOn(
          billsInstance,
          "handleClickNewBill"
        );

        // Gestion du clic sur le bouton
        const newBillButton = screen.getByTestId("btn-new-bill");
        newBillButton.addEventListener("click", () =>
          billsInstance.handleClickNewBill()
        );
        fireEvent.click(newBillButton);

        expect(handleClickNewBillSpy).toHaveBeenCalled();
        expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH.NewBill);
      });

      test("Then clicking an eye icon should open the bill modal", () => {
        // Rendu de la page
        const html = BillsUI({ data: bills });
        document.body.innerHTML = html;

        // Instanciation de Bills
        const billsInstance = new Bills({
          document,
          onNavigate: jest.fn(),
          store: null,
          localStorage: window.localStorage,
        });

        const eye = screen.getAllByTestId("icon-eye")[0];
        $.fn.modal = jest.fn(); // Mock de la modal

        const handleClickIconEye = jest.spyOn(
          billsInstance,
          "handleClickIconEye"
        );
        fireEvent.click(eye);

        expect(handleClickIconEye).toHaveBeenCalled();
        expect($.fn.modal).toHaveBeenCalledWith("show"); // Vérifie si la modal est appelée
      });
    });

    describe("And bills are fetched from the API", () => {
      test("Then getBills should fetch bills correctly", async () => {
        // Mock de la méthode bills()
        const getBillsSpy = jest.spyOn(mockStore, "bills");

        const billsInstance = new Bills({
          document,
          onNavigate: jest.fn(),
          store: mockStore,
          localStorage: window.localStorage,
        });

        const result = await billsInstance.getBills();

        // Vérifier que la méthode list() de mockStore a été appelée
        expect(getBillsSpy).toHaveBeenCalled();

        expect(result.length).toBe(4); // mockedBills retourne 4 factures
        expect(result[0].name).toBe("encore"); // Nom de la première facture
        expect(result[3].name).toBe("test2");
      });
    });

    describe("When an error occurs on API", () => {
      // Config commune pour les tests erreurs
      beforeEach(() => {
        jest.spyOn(mockStore, "bills");
        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });

        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.appendChild(root);
        router();
      });

      test("should handle corrupted date format", async () => {

        // Données avec date corrompue
        const corruptedBills = [{
          id: "1",
          status: "pending",
          date: "date-invalide", // Date invalide
          amount: 100
        }]

        // Mock du store
        const store = {
          bills: () => ({
            list: () => Promise.resolve(corruptedBills)
          })
        }

        const bills = new Bills({
          document,
          onNavigate: jest.fn(),
          store: store,
          localStorage: window.localStorage
        })

        // Récup des facture
        const result = await bills.getBills()

        expect(result[0].date).toBe("date-invalide") // Vérifie que la date non formatée est retournée
        expect(result[0].status).toBe("En attente") // Vérifie que le status est toujours formaté

      })
      test("fetches bills from an API and fails with 404 error", async () => {
        mockStore.bills.mockImplementationOnce(() => ({
          list: () => Promise.reject(new Error("Erreur 404"))
        }))

        const billsInstance = new Bills({
          document,
          onNavigate: jest.fn(),
          store: mockStore,
          localStorage: window.localStorage
        })

        // Test si rejetée avec l'erreur 404
        await expect(billsInstance.getBills()).rejects.toEqual(new Error("Erreur 404"))
      })

      test("fetches bills from an API and fails with 500 error", async () => {
        mockStore.bills.mockImplementationOnce(() => ({
          list: () => Promise.reject(new Error("Erreur 500"))
        }))

        const billsInstance = new Bills({
          document,
          onNavigate: jest.fn(),
          store: mockStore,
          localStorage: window.localStorage
        })

        // Test si l'erreur 500
        await expect(billsInstance.getBills()).rejects.toEqual(new Error("Erreur 500"))
      })
    });
  });
});

